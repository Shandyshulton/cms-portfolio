<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTranslation extends Model
{
    use HasFactory;

    protected $fillable = [
        'locale',
        'title',
        'summary',
        'description',
        'highlights',
    ];

    protected function casts(): array
    {
        return [
            'highlights' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
