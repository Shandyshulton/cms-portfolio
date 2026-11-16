<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Named rate limiters used by throttle middleware on sensitive endpoints.
     */
    private function configureRateLimiting(): void
    {
        // Admin OTP request: 3 per 5 minutes per email+IP AND 10/hour per IP.
        RateLimiter::for('admin-otp-request', function (Request $request) {
            $email = (string) $request->input('email');

            return [
                Limit::perMinutes(5, 3)->by($email.'|'.$request->ip()),
                Limit::perHour(10)->by($request->ip()),
            ];
        });

        // Admin OTP verify: 10 per 10 minutes per email+IP.
        RateLimiter::for('admin-otp-verify', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinutes(10, 10)->by($email.'|'.$request->ip());
        });

        // Public contact form: 3/min and 20/hour per IP.
        RateLimiter::for('contact-form', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perHour(20)->by($request->ip()),
            ];
        });
    }
}
