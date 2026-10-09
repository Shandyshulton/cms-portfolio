<?php

namespace Tests\Feature;

use App\Models\ContactSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_sixth_login_attempt_within_a_minute_is_throttled(): void
    {
        $credentials = ['email' => 'admin@portfolio.test', 'password' => 'wrong-password'];

        // First 5 attempts are processed (invalid credentials => 422).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/login', $credentials)->assertUnprocessable();
        }

        // The 6th attempt within the same minute is rate limited.
        $this->postJson('/api/admin/login', $credentials)->assertStatus(429);
    }

    public function test_contact_honeypot_returns_success_without_storing(): void
    {
        $response = $this->postJson('/api/public/contact-submissions', [
            'name' => 'Spam Bot',
            'email' => 'bot@example.com',
            'subject' => 'Buy now',
            'message' => 'spam',
            'website' => 'http://spam.example', // honeypot filled
        ]);

        $response->assertCreated()->assertJsonPath('submission_id', null);
        $this->assertSame(0, ContactSubmission::query()->count());
    }

    public function test_contact_rejects_crlf_in_subject_and_name(): void
    {
        $this->postJson('/api/public/contact-submissions', [
            'name' => "Jane\r\nBcc: victim@example.com",
            'email' => 'jane@example.com',
            'subject' => "Hello\nContent-Type: text/html",
            'message' => 'A legitimate message body.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'subject']);

        $this->assertSame(0, ContactSubmission::query()->count());
    }
}
