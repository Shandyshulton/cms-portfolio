<?php

namespace App\Mail;

use App\Models\ContactSubmission;
use App\Support\PayloadCrypto;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactReply extends Mailable
{
    use Queueable, SerializesModels;

    public string $recipientName;

    public string $replyMessage;

    public ?string $attachmentPath;

    public function __construct(
        public ContactSubmission $submission,
        string $replyMessage,
        ?string $attachmentPath = null,
    ) {
        $this->replyMessage = $replyMessage;
        $this->attachmentPath = $attachmentPath;
        $this->recipientName = PayloadCrypto::decryptStored($submission->name);
    }

    public function envelope(): Envelope
    {
        $subject = PayloadCrypto::decryptStored($this->submission->subject);

        return new Envelope(
            subject: "Re: {$subject}",
            replyTo: [config('mail.from.address')],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.contact-reply',
            with: [
                'subject' => PayloadCrypto::decryptStored($this->submission->subject),
                'originalMessage' => PayloadCrypto::decryptStored($this->submission->message),
            ],
        );
    }

    public function attachments(): array
    {
        if (! $this->attachmentPath) {
            return [];
        }

        return [
            Attachment::fromStorageDisk('local', $this->attachmentPath),
        ];
    }
}
