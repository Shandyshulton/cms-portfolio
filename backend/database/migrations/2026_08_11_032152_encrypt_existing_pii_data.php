<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ENCRYPTED_FIELDS = [
        'general/profile' => ['email', 'phone'],
        'contact/form' => ['recipient_email'],
    ];

    /**
     * Encrypt any legacy plaintext PII that was stored before the
     * 'encrypted' casts were introduced. Uses the query builder directly
     * to bypass model casts entirely.
     */
    public function up(): void
    {
        foreach (DB::table('contact_submissions')->orderBy('id')->cursor() as $row) {
            $updates = [];
            foreach (['name', 'email', 'subject', 'message', 'ip_address', 'user_agent'] as $field) {
                $value = $row->{$field};
                if ($value !== null && ! $this->looksEncrypted($value)) {
                    $updates[$field] = Crypt::encryptString($value);
                }
            }
            if ($updates) {
                DB::table('contact_submissions')->where('id', $row->id)->update($updates);
            }
        }

        foreach (DB::table('settings')->orderBy('id')->cursor() as $row) {
            $decoded = json_decode((string) $row->value, true);
            if (! is_array($decoded)) {
                continue;
            }

            $fields = self::ENCRYPTED_FIELDS[$row->group.'/'.$row->key] ?? [];
            $changed = false;
            foreach ($fields as $field) {
                if (isset($decoded[$field]) && is_string($decoded[$field]) && ! $this->looksEncrypted($decoded[$field])) {
                    $decoded[$field] = Crypt::encryptString($decoded[$field]);
                    $changed = true;
                }
            }

            if ($changed) {
                DB::table('settings')->where('id', $row->id)->update(['value' => json_encode($decoded)]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (DB::table('contact_submissions')->orderBy('id')->cursor() as $row) {
            $updates = [];
            foreach (['name', 'email', 'subject', 'message', 'ip_address', 'user_agent'] as $field) {
                $value = $row->{$field};
                if ($value !== null && $this->looksEncrypted($value)) {
                    try {
                        $updates[$field] = Crypt::decryptString($value);
                    } catch (\Throwable) {
                        // Skip values that cannot be decrypted.
                    }
                }
            }
            if ($updates) {
                DB::table('contact_submissions')->where('id', $row->id)->update($updates);
            }
        }

        foreach (DB::table('settings')->orderBy('id')->cursor() as $row) {
            $decoded = json_decode((string) $row->value, true);
            if (! is_array($decoded)) {
                continue;
            }

            $fields = self::ENCRYPTED_FIELDS[$row->group.'/'.$row->key] ?? [];
            $changed = false;
            foreach ($fields as $field) {
                if (isset($decoded[$field]) && is_string($decoded[$field]) && $this->looksEncrypted($decoded[$field])) {
                    try {
                        $decoded[$field] = Crypt::decryptString($decoded[$field]);
                        $changed = true;
                    } catch (\Throwable) {
                        // Skip values that cannot be decrypted.
                    }
                }
            }

            if ($changed) {
                DB::table('settings')->where('id', $row->id)->update(['value' => json_encode($decoded)]);
            }
        }
    }

    private function looksEncrypted(string $value): bool
    {
        return str_starts_with($value, 'eyJ') || str_starts_with($value, 'base64:');
    }
};
