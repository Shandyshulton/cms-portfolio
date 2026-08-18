<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use App\Models\Setting;
use App\Support\PayloadCrypto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactSubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required'],
            'email' => ['required'],
            'subject' => ['required'],
            'message' => ['required'],
        ]);

        // The public form may send encrypted { data } fields; decrypt before validating content.
        $payload = array_map(fn ($value) => PayloadCrypto::decryptString($value), $payload);

        $validated = validator($payload, [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:5000'],
        ])->validate();

        $submission = ContactSubmission::create([
            ...$validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $emailSent = $this->sendNotification($submission);

        if ($emailSent) {
            $submission->update(['email_sent_at' => now()]);
        }

        return response()->json([
            'message' => 'Message submitted successfully.',
            'submission_id' => $submission->id,
            'email_sent' => $emailSent,
        ], 201);
    }

    private function sendNotification(ContactSubmission $submission): bool
    {
        $sent = false;
        $recipient = $this->recipientEmail();
        $name = PayloadCrypto::decryptStored($submission->name);
        $email = PayloadCrypto::decryptStored($submission->email);
        $subject = PayloadCrypto::decryptStored($submission->subject);
        $message = PayloadCrypto::decryptStored($submission->message);

        try {
            Mail::raw($this->emailBody($name, $email, $subject, $message), function ($message) use ($email, $name, $subject, $recipient) {
                $message->to($recipient)
                    ->replyTo($email, $name)
                    ->subject('[Portfolio Contact] '.$subject);
            });
            $sent = true;
        } catch (\Throwable $exception) {
            Log::warning('Portfolio contact mail failed.', ['error' => $exception->getMessage()]);
        }

        if (filled(env('WEB3FORMS_ACCESS_KEY'))) {
            try {
                $response = Http::asForm()->timeout(10)->post('https://api.web3forms.com/submit', [
                    'access_key' => env('WEB3FORMS_ACCESS_KEY'),
                    'name' => $name,
                    'email' => $email,
                    'subject' => $subject,
                    'message' => $message,
                ]);
                $sent = $sent || $response->successful();
            } catch (\Throwable $exception) {
                Log::warning('Portfolio contact Web3Forms forward failed.', ['error' => $exception->getMessage()]);
            }
        }

        return $sent;
    }

    private function recipientEmail(): string
    {
        $contact = Setting::query()->where('group', 'contact')->where('key', 'form')->first()?->value ?? [];
        $profile = Setting::query()->where('group', 'general')->where('key', 'profile')->first()?->value ?? [];

        return env('MAIL_TO_ADDRESS') ?: data_get($contact, 'recipient_email') ?: data_get($profile, 'email') ?: config('mail.from.address');
    }

    private function emailBody(string $name, string $email, string $subject, string $message): string
    {
        return "New portfolio contact submission\n\n".
            "Name: {$name}\n".
            "Email: {$email}\n".
            "Subject: {$subject}\n\n".
            "Message:\n{$message}\n";
    }
}