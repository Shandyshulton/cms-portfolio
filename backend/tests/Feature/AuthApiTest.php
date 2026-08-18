<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_fetch_profile(): void
    {
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@portfolio.test',
            'password' => Hash::make('password'),
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => 'admin@portfolio.test',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

        $this->withHeader('Authorization', 'Bearer '.$login->json('token'))
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@portfolio.test');
    }

    public function test_admin_login_rejects_invalid_credentials(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'missing@portfolio.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }
}