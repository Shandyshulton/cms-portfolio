<?php

namespace App\Models;

use App\Support\PublicCache;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Experience extends Model
{
    use HasFactory;

    protected $fillable = ['company_name', 'role', 'work_model', 'location', 'start_date', 'end_date', 'is_current', 'status', 'skills', 'translations', 'sort_order'];

    protected function casts(): array
    {
        return ['is_current' => 'boolean', 'skills' => 'array', 'translations' => 'array', 'start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d'];
    }

    protected static function booted(): void
    {
        static::saved(fn () => PublicCache::flush());
        static::deleted(fn () => PublicCache::flush());
    }
}
