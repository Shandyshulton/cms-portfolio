<?php

namespace Tests\Feature;

use App\Mail\ContactReply;
use App\Models\ContactSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactReplyAttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function submission(): ContactSubmission
    {
        return ContactSubmission::create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'subject' => 'Hello',
            'message' => 'A message',
            'status' => 'new',
        ]);
    }

    public function test_reply_rejects_disallowed_attachment_types(): void
    {
        Mail::fake();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create());
        $submission = $this->submission();

        foreach (['evil.php', 'page.html', 'logo.svg'] as $name) {
            $file = UploadedFile::fake()->createWithContent($name, '<script>alert(1)</script>');

            $this->postJson("/api/admin/contact-submissions/{$submission->id}/reply", [
                'reply_message' => 'Thanks for reaching out.',
                'attachment' => $file,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors('attachment');
        }

        Mail::assertNothingSent();
    }

    public function test_reply_accepts_valid_pdf_and_leaves_no_file_on_disk(): void
    {
        Mail::fake();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create());
        $submission = $this->submission();

        // Minimal valid PDF content so the mime detection resolves to application/pdf.
        $pdf = UploadedFile::fake()->createWithContent(
            'document.pdf',
            "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
        );

        $this->postJson("/api/admin/contact-submissions/{$submission->id}/reply", [
            'reply_message' => 'Here is the document you requested.',
            'attachment' => $pdf,
        ])->assertOk()
            ->assertJsonPath('message', 'Reply sent successfully.');

        Mail::assertSent(ContactReply::class);

        // The temporary attachment must be removed in the finally block, so the
        // private disk should contain no leftover files under uploads/replies.
        $this->assertEmpty(Storage::disk('local')->files('uploads/replies'));
    }
}
