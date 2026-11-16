<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AdminOtpCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    private const OTP_TTL_MINUTES = 1;

    private const OTP_MAX_ATTEMPTS = 5;

    private const OTP_RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Email a one-time login code to a whitelisted address.
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));

        if (! in_array($email, config('admin.allowed_emails', []), true)) {
            throw ValidationException::withMessages([
                'email' => ['This email is not allowed to access the CMS.'],
            ]);
        }

        if (Cache::has($this->sentKey($email))) {
            throw ValidationException::withMessages([
                'email' => ['A code was just sent. Please wait before requesting another.'],
            ]);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put($this->otpKey($email), [
            'hash' => Hash::make($code),
            'attempts' => 0,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        try {
            Mail::to($email)->send(new AdminOtpCode($code, self::OTP_TTL_MINUTES));
        } catch (Throwable $e) {
            Cache::forget($this->otpKey($email));
            report($e);

            return response()->json([
                'message' => 'Could not send the OTP code. Please try again.',
            ], 502);
        }

        Cache::put($this->sentKey($email), true, now()->addSeconds(self::OTP_RESEND_COOLDOWN_SECONDS));

        return response()->json([
            'message' => 'We sent a one-time code to your email.',
            'expires_in' => self::OTP_TTL_MINUTES * 60,
            'resend_after' => self::OTP_RESEND_COOLDOWN_SECONDS,
        ]);
    }

    /**
     * Verify the one-time code and issue a Sanctum token.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ]);

        $email = strtolower(trim($validated['email']));

        if (! in_array($email, config('admin.allowed_emails', []), true)) {
            throw ValidationException::withMessages([
                'email' => ['This email is not allowed to access the CMS.'],
            ]);
        }

        $key = $this->otpKey($email);
        $entry = Cache::get($key);

        if (! is_array($entry)) {
            throw ValidationException::withMessages([
                'code' => ['The code is invalid or has expired. Request a new one.'],
            ]);
        }

        if (($entry['attempts'] ?? 0) >= self::OTP_MAX_ATTEMPTS) {
            Cache::forget($key);

            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Request a new code.'],
            ]);
        }

        if (! Hash::check($validated['code'], $entry['hash'])) {
            $entry['attempts'] = ($entry['attempts'] ?? 0) + 1;
            Cache::put($key, $entry, now()->addMinutes(self::OTP_TTL_MINUTES));

            throw ValidationException::withMessages([
                'code' => ['The code is incorrect.'],
            ]);
        }

        Cache::forget($key);
        Cache::forget($this->sentKey($email));

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => config('admin.name', 'Admin'),
                'password' => Hash::make(Str::random(40)),
                'email_verified_at' => now(),
            ]
        );

        // Invalidate any previously issued tokens so only one active session
        // per login exists (limits blast radius of a leaked token).
        $user->tokens()->delete();

        $token = $user->createToken('cms-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function encryptionKey(Request $request): JsonResponse
    {
        $key = config('services.payload_encryption_key');

        abort_if(blank($key), 500, 'PAYLOAD_ENCRYPTION_KEY is not configured.');

        return response()->json([
            'key' => $key,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function otpKey(string $email): string
    {
        return 'admin-otp:'.$email;
    }

    private function sentKey(string $email): string
    {
        return 'admin-otp-sent:'.$email;
    }
}
