<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('admin.email');
        $password = config('admin.password');

        // Never seed a default/guessable password. Operators must set
        // ADMIN_PASSWORD explicitly before seeding.
        if (blank($password)) {
            throw new RuntimeException(
                'ADMIN_PASSWORD is not set. Define ADMIN_EMAIL/ADMIN_PASSWORD in your '
                .'environment before running db:seed so no default password is created.'
            );
        }

        // firstOrCreate: never reset an existing admin's password on re-seed.
        User::firstOrCreate(
            ['email' => $email],
            [
                'name' => config('admin.name'),
                'password' => Hash::make($password),
            ]
        );

        // Demo/sample content is seeded only outside production, or explicitly
        // via `php artisan db:seed --class=DemoContentSeeder` with --force-demo.
        if (! app()->isProduction()) {
            $this->call(DemoContentSeeder::class);
        } else {
            $this->command?->warn('Production environment detected: demo content skipped. '
                .'Run DemoContentSeeder manually with --force-demo if intended.');
        }
    }
}
