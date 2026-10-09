<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Initial Admin Account
    |--------------------------------------------------------------------------
    |
    | Credentials used by DatabaseSeeder to create the first admin user.
    | ADMIN_PASSWORD has no default on purpose: seeding fails if it is blank
    | so a guessable password is never created.
    |
    */

    'name' => env('ADMIN_NAME', 'Admin User'),
    'email' => env('ADMIN_EMAIL', 'admin@portfolio.test'),
    'password' => env('ADMIN_PASSWORD'),

];
