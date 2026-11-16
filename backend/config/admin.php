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

    /*
    |--------------------------------------------------------------------------
    | Allowed Login Emails (OTP whitelist)
    |--------------------------------------------------------------------------
    |
    | Only these addresses may request a login OTP. Comma-separated in env.
    |
    */

    'allowed_emails' => array_values(array_filter(array_map(
        fn ($email) => strtolower(trim($email)),
        explode(',', (string) env(
            'ADMIN_ALLOWED_EMAILS',
            'portfolioshandy@gmail.com,ssshandy60@gmail.com,shandyshultonshihab@gmail.com'
        ))
    ))),

];
