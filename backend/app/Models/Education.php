<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Education extends Model
{
    use HasFactory;

    protected $table = 'educations';

    protected $fillable = ['institution_name', 'degree', 'field_of_study', 'location', 'logo_url', 'start_date', 'end_date', 'status', 'translations', 'sort_order'];

    protected function casts(): array
    {
        return ['translations' => 'array', 'start_date' => 'date', 'end_date' => 'date'];
    }

    protected static function booted(): void
    {
        static::deleting(function (Education $education) {
            self::deleteStoredFile($education->getRawOriginal('logo_url'));
        });
    }

    public function getLogoUrlAttribute(?string $value): ?string
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
