<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ContactReply;
use App\Models\ContactSubmission;
use App\Support\PayloadCrypto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ContactSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginator = ContactSubmission::query()
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        $paginator->getCollection()->transform(
            fn (ContactSubmission $submission) => PayloadCrypto::encryptSubmission($submission->toArray())
        );

        return response()->json($paginator);
    }

    public function show(ContactSubmission $contactSubmission): JsonResponse
    {
        if (! $contactSubmission->read_at) {
            $contactSubmission->update(['read_at' => now(), 'status' => 'read']);
        }

        return response()->json([
            'submission' => PayloadCrypto::encryptSubmission($contactSubmission->refresh()->toArray()),
        ]);
    }

    public function update(Request $request, ContactSubmission $contactSubmission): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['required', 'in:new,read,archived'],
        ]);

        $contactSubmission->update([
            'status' => $payload['status'],
            'read_at' => $payload['status'] === 'new' ? null : ($contactSubmission->read_at ?? now()),
        ]);

        return response()->json([
            'message' => 'Submission updated successfully.',
            'submission' => PayloadCrypto::encryptSubmission($contactSubmission->refresh()->toArray()),
        ]);
    }

    public function reply(Request $request, ContactSubmission $contactSubmission): JsonResponse
    {
        $payload = $request->validate([
            'reply_message' => ['required', 'string', 'max:5000'],
            'attachment' => [
                'nullable',
                'file',
                'max:10240',
                'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,txt,zip',
                'mimetypes:application/pdf,image/jpeg,image/png,image/webp,'
                    .'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,'
                    .'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,'
                    .'text/plain,application/zip,application/x-zip-compressed',
            ],
        ]);

        $email = PayloadCrypto::decryptStored($contactSubmission->email);

        // Store on the PRIVATE 'local' disk with a random name and an extension
        // derived from the allowlist (never from the client-supplied name/content).
        $attachment = null;
        if ($request->hasFile('attachment') && $request->file('attachment')->isValid()) {
            $file = $request->file('attachment');
            $extension = $this->safeAttachmentExtension($file);
            $attachment = $file->storeAs('uploads/replies', Str::random(40).'.'.$extension, 'local');
        }

        try {
            Mail::to($email)->send(new ContactReply($contactSubmission, $payload['reply_message'], $attachment));
        } catch (\Throwable $exception) {
            Log::warning('Contact reply mail failed.', ['error' => $exception->getMessage()]);

            return response()->json(['message' => 'Failed to send reply. Please check the mail configuration.'], 502);
        } finally {
            // Always remove the temporary attachment, whether the mail succeeded or failed.
            if ($attachment) {
                Storage::disk('local')->delete($attachment);
            }
        }

        $contactSubmission->update([
            'status' => 'read',
            'read_at' => $contactSubmission->read_at ?? now(),
            'replied_at' => now(),
        ]);

        return response()->json([
            'message' => 'Reply sent successfully.',
            'submission' => PayloadCrypto::encryptSubmission($contactSubmission->refresh()->toArray()),
        ]);
    }

    /**
     * Pick a safe file extension from the allowlist based on the detected MIME
     * type, falling back to the (already validated) client extension. The
     * stored name never trusts the raw client filename.
     */
    private function safeAttachmentExtension(\Illuminate\Http\UploadedFile $file): string
    {
        $allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'];

        $byMime = [
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'application/msword' => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'text/plain' => 'txt',
            'application/zip' => 'zip',
            'application/x-zip-compressed' => 'zip',
        ];

        $mime = (string) $file->getMimeType();
        if (isset($byMime[$mime])) {
            return $byMime[$mime];
        }

        $clientExt = strtolower((string) $file->getClientOriginalExtension());

        return in_array($clientExt, $allowed, true) ? $clientExt : 'bin';
    }

    public function destroy(ContactSubmission $contactSubmission): JsonResponse
    {
        $contactSubmission->delete();

        return response()->json(['message' => 'Submission deleted successfully.']);
    }
}
