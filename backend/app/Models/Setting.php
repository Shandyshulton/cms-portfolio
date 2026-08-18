<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = ['group', 'key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    /**
     * Sensitive fields inside the JSON value that must be encrypted at rest.
     * The row key (group/key) determines which fields are encrypted.
     */
    private function encryptedValueFields(): array
    {
        return [
            'general/profile' => ['email', 'phone'],
            'contact/form' => ['recipient_email'],
        ];
    }

    /**
     * Encrypt sensitive fields inside the JSON value before persisting.
     */
    public function setValueAttribute($value): void
    {
        $value = is_array($value) ? $value : json_decode((string) $value, true) ?? [];

        foreach ($this->encryptedValueFields()[$this->group.'/'.$this->key] ?? [] as $field) {
            if (isset($value[$field]) && is_string($value[$field]) && $value[$field] !== '') {
                $value[$field] = Crypt::encryptString($value[$field]);
            }
        }

        $this->attributes['value'] = json_encode($value);
    }

    /**
     * Decrypt sensitive fields inside the JSON value when reading.
     */
    public function getValueAttribute($value): array
    {
        $value = is_array($value) ? $value : json_decode((string) $value, true) ?? [];

        foreach ($this->encryptedValueFields()[$this->group.'/'.$this->key] ?? [] as $field) {
            if (isset($value[$field]) && is_string($value[$field])) {
                try {
                    $value[$field] = Crypt::decryptString($value[$field]);
                } catch (\Throwable) {
                    // Legacy plaintext value: leave as-is.
                }
            }
        }

        return $value;
    }
}
