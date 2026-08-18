<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_project_with_hero_and_gallery_images(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());

        $payload = [
            'slug' => 'easy-saving',
            'client_name' => 'EasySaving',
            'category' => 'Financial Web Application',
            'status' => 'published',
            'is_featured' => true,
            'stacks' => ['Laravel', 'React', 'MySQL'],
            'live_url' => 'https://easysaving.asia/',
            'translations' => [
                'id' => ['title' => 'EasySaving', 'summary' => 'Platform tabungan digital.', 'description' => 'Project production yang berjalan di VPS.', 'highlights' => ['Production VPS']],
                'en' => ['title' => 'EasySaving', 'summary' => 'Digital saving platform.', 'description' => 'A production project running on a VPS.', 'highlights' => ['Production VPS']],
            ],
            'hero_image' => ['alt_text' => 'EasySaving hero', 'caption' => 'Hero preview'],
            'gallery_images' => [['alt_text' => 'EasySaving dashboard', 'caption' => 'Dashboard preview']],
        ];

        $response = $this->post('/api/admin/projects', [
            'payload' => json_encode($payload),
            'hero_image' => ['file' => UploadedFile::fake()->image('hero.png')],
            'gallery_images' => [['file' => UploadedFile::fake()->image('dashboard.png')]],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('project.slug', 'easy-saving')
            ->assertJsonCount(2, 'project.translations')
            ->assertJsonCount(2, 'project.images')
            ->assertJsonPath('project.images.0.image_type', 'gallery')
            ->assertJsonPath('project.images.1.image_type', 'hero');

        $this->getJson('/api/public/projects')
            ->assertOk()
            ->assertJsonPath('0.slug', 'easy-saving');
    }
}
