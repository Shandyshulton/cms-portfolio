<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Education;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EducationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Education::query()->orderBy('sort_order')->latest('id')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $education = Education::create($this->validated($request));
        return response()->json(['message' => 'Education created successfully.', 'education' => $education], 201);
    }

    public function show(Education $education): JsonResponse
    {
        return response()->json(['education' => $education]);
    }

    public function update(Request $request, Education $education): JsonResponse
    {
        $data = $this->validated($request, $education);
        $education->update($data);
        return response()->json(['message' => 'Education updated successfully.', 'education' => $education->refresh()]);
    }

    public function destroy(Education $education): JsonResponse
    {
        $education->delete();
        return response()->json(['message' => 'Education deleted successfully.']);
    }

    private function validated(Request $request, ?Education $education = null): array
    {
        $input = $this->payloadInput($request);
        $validator = Validator::make($input, [
            'institution_name' => ['required', 'string', 'max:180'],
            'degree' => ['nullable', 'string', 'max:180'],
            'field_of_study' => ['nullable', 'string', 'max:180'],
            'location' => ['nullable', 'string', 'max:160'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'translations' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validator->after(function ($validator) use ($request) {
            $file = $request->file('logo_file');
            if ($file && ! $this->isValidImage($file)) {
                $validator->errors()->add('logo_file', 'Logo must be jpg, jpeg, png, webp, or gif and max 4MB.');
            }
        });

        $data = $validator->validate();
        $file = $request->file('logo_file');

        if ($file instanceof UploadedFile) {
            if ($education?->getRawOriginal('logo_url')) {
                Education::deleteStoredFile($education->getRawOriginal('logo_url'));
            }
            $data['logo_url'] = $this->storeImage($file, 'uploads/educations');
        } elseif ($education) {
            $data['logo_url'] = $education->getRawOriginal('logo_url');
        } else {
            $data['logo_url'] = null;
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
