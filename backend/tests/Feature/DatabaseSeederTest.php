<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_fails_when_admin_password_is_blank(): void
    {
        config(['admin.password' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ADMIN_PASSWORD is not set');

        $this->seed(DatabaseSeeder::class);
    }

    public function test_seeder_creates_admin_without_resetting_existing_password(): void
    {
        config([
            'admin.email' => 'admin@portfolio.test',
            'admin.password' => 'seeder-secret',
        ]);

        // Pre-existing admin with a DIFFERENT password must not be overwritten.
        $existing = User::create([
            'name' => 'Existing Admin',
            'email' => 'admin@portfolio.test',
            'password' => Hash::make('original-password'),
        ]);
        $originalHash = $existing->password;

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, User::where('email', 'admin@portfolio.test')->count());
        $this->assertSame($originalHash, $existing->fresh()->password, 'firstOrCreate must not reset an existing password.');
    }

    public function test_seeder_creates_admin_when_none_exists(): void
    {
        config([
            'admin.email' => 'fresh@portfolio.test',
            'admin.password' => 'seeder-secret',
        ]);

        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'fresh@portfolio.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('seeder-secret', $user->password));
    }
}
