<?php

namespace App\Models;

use App\Support\PublicCache;
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
        return ['translations' => 'array', 'start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d'];
    }

    protected static function booted(): void
    {
        static::saved(fn () => PublicCache::flush());
        static::deleted(fn () => PublicCache::flush());

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
