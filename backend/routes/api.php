<?php

use App\Http\Controllers\Api\Admin\CertificationController;
use App\Http\Controllers\Api\Admin\ContactSubmissionController as AdminContactSubmissionController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EducationController;
use App\Http\Controllers\Api\Admin\ExperienceController;
use App\Http\Controllers\Api\Admin\ProjectController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Public\ContactSubmissionController as PublicContactSubmissionController;
use App\Models\Certification;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/encryption-key', [AuthController::class, 'encryptionKey']);
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::apiResource('projects', ProjectController::class);
        Route::apiResource('experiences', ExperienceController::class);
        Route::apiResource('educations', EducationController::class);
        Route::apiResource('certifications', CertificationController::class);
        Route::apiResource('contact-submissions', AdminContactSubmissionController::class)->only(['index', 'show', 'update', 'destroy']);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});

Route::prefix('public')->group(function () {
    Route::get('/health', fn () => response()->json(['status' => 'ok']));
    Route::get('/settings', function () {
        $settings = Setting::query()->get()->groupBy('group')->map(fn ($items) => $items->pluck('value', 'key'))->toArray();

        // Never expose PII through the public API.
        unset($settings['general']['profile']['email'], $settings['general']['profile']['phone']);
        unset($settings['contact']['form']['recipient_email']);

        return response()->json(['settings' => $settings]);
    });
    Route::get('/projects', fn () => Project::query()->with(['translations', 'images'])->where('status', 'published')->orderBy('sort_order')->latest('published_at')->get());
    Route::get('/experiences', fn () => Experience::query()->where('status', 'published')->orderBy('sort_order')->latest('id')->get());
    Route::get('/educations', fn () => Education::query()->where('status', 'published')->orderBy('sort_order')->latest('id')->get());
    Route::get('/certifications', fn () => Certification::query()->where('status', 'published')->orderBy('sort_order')->latest('id')->get());
    Route::post('/contact-submissions', [PublicContactSubmissionController::class, 'store']);
});