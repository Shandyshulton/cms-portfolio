<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImageUploadValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());
    }

    public function test_certification_rejects_non_image_content(): void
    {
        // A .png name but the bytes are plain text — content validation must reject it.
        $fake = UploadedFile::fake()->createWithContent('malicious.png', '<?php echo "pwned"; ?>');

        $this->post('/api/admin/certifications', [
            'payload' => json_encode(['name' => 'Fake Badge', 'status' => 'published']),
            'badge_file' => $fake,
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('badge_file');
    }

    public function test_certification_accepts_real_image(): void
    {
        $image = UploadedFile::fake()->image('badge.png', 120, 120);

        $this->post('/api/admin/certifications', [
            'payload' => json_encode(['name' => 'Real Badge', 'status' => 'published']),
            'badge_file' => $image,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('certification.name', 'Real Badge');
    }
}
