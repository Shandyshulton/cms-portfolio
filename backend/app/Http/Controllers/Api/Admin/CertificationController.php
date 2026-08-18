<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CertificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Certification::query()->orderBy('sort_order')->latest('id')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $certification = Certification::create($this->validated($request));
        return response()->json(['message' => 'Certification created successfully.', 'certification' => $certification], 201);
    }

    public function show(Certification $certification): JsonResponse
    {
        return response()->json(['certification' => $certification]);
    }

    public function update(Request $request, Certification $certification): JsonResponse
    {
        $certification->update($this->validated($request, $certification));
        return response()->json(['message' => 'Certification updated successfully.', 'certification' => $certification->refresh()]);
    }

    public function destroy(Certification $certification): JsonResponse
    {
        $certification->delete();
        return response()->json(['message' => 'Certification deleted successfully.']);
    }

    private function validated(Request $request, ?Certification $certification = null): array
    {
        $input = $this->payloadInput($request);
        $validator = Validator::make($input, [
            'name' => ['required', 'string', 'max:180'],
            'issuer' => ['nullable', 'string', 'max:180'],
            'credential_id' => ['nullable', 'string', 'max:180'],
            'credential_url' => ['nullable', 'url', 'max:255'],
            'issued_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'skills' => ['nullable', 'array'],
            'translations' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validator->after(function ($validator) use ($request) {
            $file = $request->file('badge_file');
            if ($file && ! $this->isValidImage($file)) {
                $validator->errors()->add('badge_file', 'Badge must be jpg, jpeg, png, webp, or gif and max 4MB.');
            }
        });

        $data = $validator->validate();
        $file = $request->file('badge_file');

        if ($file instanceof UploadedFile) {
            if ($certification?->getRawOriginal('badge_url')) {
                Certification::deleteStoredFile($certification->getRawOriginal('badge_url'));
            }
            $data['badge_url'] = $this->storeImage($file, 'uploads/certifications');
        } elseif ($certification) {
            $data['badge_url'] = $certification->getRawOriginal('badge_url');
        } else {
            $data['badge_url'] = null;
        }

        return $data;
    }

    private function payloadInput(Request $request): array
    {
        if ($request->has('payload')) {
            return json_decode($request->string('payload')->toString(), true) ?: [];
        }

        return $request->all();
    }

    private function storeImage(UploadedFile $file, string $directory): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        return $file->storeAs($directory, (string) Str::uuid().'.'.$extension, 'public');
    }

    private function isValidImage(UploadedFile $file): bool
    {
        return $file->isValid()
            && $file->getSize() <= 4096 * 1024
            && in_array(strtolower($file->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'webp', 'gif'], true);
    }
}
