<?php

namespace App\Models;

use App\Support\ImageOptimizer;
use App\Support\PublicCache;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ProjectImage extends Model
{
    use HasFactory;

    protected $fillable = ['image_url', 'image_type', 'alt_text', 'caption', 'is_cover', 'sort_order'];

    protected function casts(): array
    {
        return ['is_cover' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saved(fn () => PublicCache::flush());
        static::deleted(fn () => PublicCache::flush());

        static::deleting(function (ProjectImage $image) {
            self::deleteStoredFile($image->getRawOriginal('image_url'));
        });
    }

    public function getImageUrlAttribute(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        return asset('storage/'.$value);
    }

    /**
     * Low-resolution thumbnail for list views and fast previews.
     * Thumbnails are generated eagerly on upload and via the
     * optimize:images command, so this accessor never processes
     * images inside a request.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        $path = $this->getRawOriginal('image_url');

        if (! $path || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return null;
        }

        $thumbnail = ImageOptimizer::thumbnailPathFor($path);

        if (! Storage::disk('public')->exists($thumbnail)) {
            return $this->image_url;
        }

        return asset('storage/'.$thumbnail);
    }

    public static function deleteStoredFile(?string $path): void
    {
        if ($path && str_starts_with($path, 'uploads/')) {
            Storage::disk('public')->delete($path);
            ImageOptimizer::deleteThumbnail($path);
        }
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
