<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactSubmission extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'email', 'subject', 'message', 'status', 'email_sent_at', 'read_at', 'ip_address', 'user_agent'];

    protected function casts(): array
    {
        return [
            'email_sent_at' => 'datetime',
            'read_at' => 'datetime',
            'name' => 'encrypted',
            'email' => 'encrypted',
            'subject' => 'encrypted',
            'message' => 'encrypted',
            'ip_address' => 'encrypted',
            'user_agent' => 'encrypted',
        ];
    }
}
