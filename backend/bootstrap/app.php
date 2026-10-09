<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        // Trust reverse proxies so request IPs (used by rate limiting) are accurate.
        // Set TRUSTED_PROXIES to a comma-separated list, or '*' behind a trusted LB.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', ''));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();