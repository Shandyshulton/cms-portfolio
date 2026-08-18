<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Certification extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'issuer', 'credential_id', 'credential_url', 'badge_url', 'issued_at', 'expires_at', 'status', 'skills', 'translations', 'sort_order'];

    protected function casts(): array
    {
        return ['skills' => 'array', 'translations' => 'array', 'issued_at' => 'date', 'expires_at' => 'date'];
    }

    protected static function booted(): void
    {
        static::deleting(function (Certification $certification) {
            self::deleteStoredFile($certification->getRawOriginal('badge_url'));
        });
    }

    public function getBadgeUrlAttribute(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        return asset('storage/'.$value);
    }

    public static function deleteStoredFile(?string $path): void
    {
        if ($path && str_starts_with($path, 'uploads/')) {
            Storage::disk('public')->delete($path);
        }
    }
}
