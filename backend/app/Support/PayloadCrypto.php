<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;

class PayloadCrypto
{
    /**
     * Decrypt a stored (at-rest) value, which is either a Crypt-encrypted string
     * (from the 'encrypted' cast) or a plain string (legacy data).
     */
    public static function decryptStored(array|string|null $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (! is_string($value)) {
            return self::decrypt($value);
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    /**
     * Encrypt a plaintext value into a { data } object using AES-256-GCM
     * with the payload encryption key shared with the frontend.
     * Format: iv(12) + ciphertext + tag(16) — matches WebCrypto output.
     */
    public static function encrypt(string $value): array
    {
        $key = self::payloadKey();
        $iv = random_bytes(12);
        $ciphertext = openssl_encrypt($value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        return ['data' => base64_encode($iv . $ciphertext . $tag)];
    }

    /**
     * Decrypt a { data } object or plain string produced by the frontend.
     */
    public static function decrypt(array|string $value): string
    {
        if (! is_array($value)) {
            return $value;
        }

        if (! isset($value['data']) || ! is_string($value['data'])) {
            return '';
        }

        $raw = base64_decode($value['data'], true);
        if ($raw === false || strlen($raw) < 29) {
            return '';
        }

        $key = self::payloadKey();
        $iv = substr($raw, 0, 12);
        $ciphertext = substr($raw, 12, -16);
        $tag = substr($raw, -16);

        $plaintext = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        return $plaintext === false ? '' : $plaintext;
    }

    /**
     * Decrypt a single payload value (string or { data } object) to plaintext.
     */
    public static function decryptString(array|string|null $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return self::decrypt($value);
    }

    /**
     * Decrypt encrypted PII fields inside a settings payload.
     * Structure: settings[group][key] = { field: value, ... }.
     */
    public static function decryptSettings(array $settings): array
    {
        $fields = [
            'general' => ['profile' => ['email', 'phone']],
            'contact' => ['form' => ['recipient_email']],
        ];

        foreach ($fields as $group => $keys) {
            foreach ($keys as $key => $fieldList) {
                foreach ($fieldList as $field) {
                    if (isset($settings[$group][$key][$field])) {
                        $settings[$group][$key][$field] = self::decrypt($settings[$group][$key][$field]);
                    }
                }
            }
        }

        return $settings;
    }

    /**
     * Wrap PII fields of a contact submission in encrypted { data } objects.
     */
    public static function encryptSubmission(array $submission): array
    {
        foreach (['name', 'email', 'subject', 'message', 'ip_address', 'user_agent'] as $field) {
            if (isset($submission[$field]) && is_string($submission[$field])) {
                $submission[$field] = self::encrypt($submission[$field]);
            }
        }

        return $submission;
    }

    /**
     * Wrap sensitive settings fields in encrypted { data } objects.
     * Structure: settings[group][key] = { field: value, ... }.
     */
    public static function encryptSettings(array $settings): array
    {
        $fields = [
            'general' => ['profile' => ['email', 'phone']],
            'contact' => ['form' => ['recipient_email']],
        ];

        foreach ($fields as $group => $keys) {
            foreach ($keys as $key => $fieldList) {
                foreach ($fieldList as $field) {
                    if (isset($settings[$group][$key][$field]) && is_string($settings[$group][$key][$field])) {
                        $settings[$group][$key][$field] = self::encrypt($settings[$group][$key][$field]);
                    }
                }
            }
        }

        return $settings;
    }

    private static function payloadKey(): string
    {
        $key = env('PAYLOAD_ENCRYPTION_KEY');

        abort_if(blank($key), 500, 'PAYLOAD_ENCRYPTION_KEY is not configured.');

        return base64_decode($key, true) ?: $key;
    }
}
