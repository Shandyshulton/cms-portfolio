<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TokenLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin User',
            'email' => 'admin@portfolio.test',
            'password' => Hash::make('password'),
        ]);
    }

    public function test_login_revokes_previously_issued_tokens(): void
    {
        $user = $this->admin();

        $first = $this->postJson('/api/admin/login', [
            'email' => 'admin@portfolio.test',
            'password' => 'password',
        ])->assertOk()->json('token');

        $second = $this->postJson('/api/admin/login', [
            'email' => 'admin@portfolio.test',
            'password' => 'password',
        ])->assertOk()->json('token');

        // Only one token row remains after the second login...
        $this->assertSame(1, $user->fresh()->tokens()->count());

        // ...and it corresponds to the NEW token, not the old one. Personal
        // access tokens are stored as sha256(plainTextTokenWithoutId).
        $firstHash = hash('sha256', explode('|', $first, 2)[1]);
        $secondHash = hash('sha256', explode('|', $second, 2)[1]);

        $this->assertDatabaseMissing('personal_access_tokens', ['token' => $firstHash]);
        $this->assertDatabaseHas('personal_access_tokens', ['token' => $secondHash]);
    }

    public function test_sanctum_token_expiration_is_configured(): void
    {
        $this->assertSame(480, config('sanctum.expiration'));
    }
}
