<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'client_name', 'category', 'status', 'is_featured', 'stacks', 'live_url', 'repository_url', 'sort_order', 'published_at'];

    protected function casts(): array
    {
        return ['is_featured' => 'boolean', 'stacks' => 'array', 'published_at' => 'datetime'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ProjectTranslation::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProjectImage::class)->orderBy('image_type')->orderBy('sort_order');
    }

    public function heroImage(): HasOne
    {
        return $this->hasOne(ProjectImage::class)->where('image_type', 'hero')->oldest('sort_order');
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(ProjectImage::class)->where('image_type', 'gallery')->orderBy('sort_order');
    }
}
