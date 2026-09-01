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

class ContactSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginator = ContactSubmission::query()
            ->latest()
            ->paginate($request->integer('per_page', 20));

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
        ]);

        $email = PayloadCrypto::decryptStored($contactSubmission->email);

        try {
            Mail::to($email)->send(new ContactReply($contactSubmission, $payload['reply_message']));
        } catch (\Throwable $exception) {
            Log::warning('Contact reply mail failed.', ['error' => $exception->getMessage()]);

            return response()->json(['message' => 'Failed to send reply. Please check the mail configuration.'], 502);
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

    public function destroy(ContactSubmission $contactSubmission): JsonResponse
    {
        $contactSubmission->delete();

        return response()->json(['message' => 'Submission deleted successfully.']);
    }
}
