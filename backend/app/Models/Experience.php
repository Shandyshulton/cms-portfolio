<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Experience extends Model
{
    use HasFactory;

    protected $fillable = ['company_name', 'role', 'work_model', 'location', 'start_date', 'end_date', 'is_current', 'status', 'skills', 'translations', 'sort_order'];

    protected function casts(): array
    {
        return ['is_current' => 'boolean', 'skills' => 'array', 'translations' => 'array', 'start_date' => 'date', 'end_date' => 'date'];
    }
}
