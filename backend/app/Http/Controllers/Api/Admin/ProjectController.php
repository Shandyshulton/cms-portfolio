<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Project::query()
            ->with(['translations', 'images'])
            ->orderBy('sort_order')
            ->latest('id')
            ->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $project = DB::transaction(function () use ($request, $payload) {
            $project = Project::create($payload['project']);
            $this->syncTranslations($project, $payload['translations']);
            $this->syncImages($request, $project, $payload['hero_image'], $payload['gallery_images']);

            return $project->load(['translations', 'images']);
        });

        return response()->json(['message' => 'Project created successfully.', 'project' => $project], 201);
    }

    public function show(Project $project): JsonResponse
    {
        return response()->json(['project' => $project->load(['translations', 'images'])]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $payload = $this->validatedPayload($request, $project);

        $project = DB::transaction(function () use ($request, $project, $payload) {
            $project->update($payload['project']);
            $this->syncTranslations($project, $payload['translations']);
            $this->syncImages($request, $project, $payload['hero_image'], $payload['gallery_images']);

            return $project->refresh()->load(['translations', 'images']);
        });

        return response()->json(['message' => 'Project updated successfully.', 'project' => $project]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $project->images()->get()->each->delete();
        $project->delete();

        return response()->json(['message' => 'Project deleted successfully.']);
    }

    private function validatedPayload(Request $request, ?Project $project = null): array
    {
        $input = $this->payloadInput($request);

        $validator = Validator::make($input, [
            'slug' => ['nullable', 'string', 'max:160', Rule::unique('projects', 'slug')->ignore($project?->id)],
            'client_name' => ['nullable', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:120'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'is_featured' => ['boolean'],
            'stacks' => ['nullable', 'array'],
            'stacks.*' => ['string', 'max:80'],
            'live_url' => ['nullable', 'url', 'max:255'],
            'repository_url' => ['nullable', 'url', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'translations' => ['required', 'array'],
            'translations.id.title' => ['required', 'string', 'max:180'],
            'translations.id.summary' => ['nullable', 'string', 'max:260'],
            'translations.id.description' => ['nullable', 'string'],
            'translations.id.highlights' => ['nullable', 'array'],
            'translations.en.title' => ['nullable', 'string', 'max:180'],
            'translations.en.summary' => ['nullable', 'string', 'max:260'],
            'translations.en.description' => ['nullable', 'string'],
            'translations.en.highlights' => ['nullable', 'array'],
            'hero_image' => ['nullable', 'array'],
            'hero_image.id' => ['nullable', 'integer'],
            'hero_image.alt_text' => ['nullable', 'string', 'max:160'],
            'hero_image.caption' => ['nullable', 'string', 'max:180'],
            'gallery_images' => ['nullable', 'array'],
            'gallery_images.*.id' => ['nullable', 'integer'],
            'gallery_images.*.alt_text' => ['nullable', 'string', 'max:160'],
            'gallery_images.*.caption' => ['nullable', 'string', 'max:180'],
            'gallery_images.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validator->after(function ($validator) use ($request, $input) {
            $this->validateImageRow($validator, $request, 'hero_image', $input['hero_image'] ?? null, true);

            foreach (array_values($input['gallery_images'] ?? []) as $index => $image) {
                $this->validateImageRow($validator, $request, "gallery_images.{$index}", $image, false);
            }
        });

        $validated = $validator->validate();
        $title = data_get($validated, 'translations.id.title');

        return [
            'project' => [
                'slug' => $validated['slug'] ?? Str::slug($title),
                'client_name' => $validated['client_name'] ?? null,
                'category' => $validated['category'] ?? null,
                'status' => $validated['status'],
                'is_featured' => (bool) ($validated['is_featured'] ?? false),
                'stacks' => $validated['stacks'] ?? [],
                'live_url' => $validated['live_url'] ?? null,
                'repository_url' => $validated['repository_url'] ?? null,
                'sort_order' => (int) ($validated['sort_order'] ?? 0),
                'published_at' => $validated['status'] === 'published' ? now() : null,
            ],
            'translations' => $validated['translations'],
            'hero_image' => $validated['hero_image'] ?? null,
            'gallery_images' => $validated['gallery_images'] ?? [],
        ];
    }

    private function validateImageRow($validator, Request $request, string $path, ?array $image, bool $optional): void
    {
        if (! $image) {
            return;
        }

        $file = $request->file("{$path}.file");
        if (! $optional && ! $file && ! filled($image['id'] ?? null)) {
            $validator->errors()->add("{$path}.file", 'Image file is required.');
        }

        if ($file && ! $this->isValidImage($file)) {
            $validator->errors()->add("{$path}.file", 'Image must be jpg, jpeg, png, webp, or gif and max 4MB.');
        }
    }

    private function payloadInput(Request $request): array
    {
        if ($request->has('payload')) {
            return json_decode($request->string('payload')->toString(), true) ?: [];
        }

        return $request->all();
    }

    private function syncTranslations(Project $project, array $translations): void
    {
        foreach (['id', 'en'] as $locale) {
            $translation = $translations[$locale] ?? [];
            if (! filled($translation['title'] ?? null)) {
                continue;
            }

            $project->translations()->updateOrCreate(['locale' => $locale], [
                'title' => $translation['title'],
                'summary' => $translation['summary'] ?? null,
                'description' => $translation['description'] ?? null,
                'highlights' => $translation['highlights'] ?? [],
            ]);
        }
    }

    private function syncImages(Request $request, Project $project, ?array $heroImage, array $galleryImages): void
    {
        $existing = $project->images()->get()->keyBy('id');
        $keptIds = [];

        if ($heroImage) {
            $hero = $this->upsertImage($request, $project, $existing, $heroImage, 'hero_image', 'hero', 0, true);
            if ($hero) {
                $keptIds[] = $hero->id;
            }
        } else {
            $project->images()->where('image_type', 'hero')->get()->each->delete();
        }

        foreach (array_values($galleryImages) as $index => $image) {
            $gallery = $this->upsertImage($request, $project, $existing, $image, "gallery_images.{$index}", 'gallery', $index, false);
            if ($gallery) {
                $keptIds[] = $gallery->id;
            }
        }

        $project->images()->whereNotIn('id', $keptIds)->get()->each->delete();
    }

    private function upsertImage(Request $request, Project $project, $existing, array $image, string $filePath, string $type, int $index, bool $isCover): ?ProjectImage
    {
        $current = isset($image['id']) ? $existing->get((int) $image['id']) : null;
        $path = $current?->getRawOriginal('image_url');
        $file = $request->file("{$filePath}.file");

        if ($file instanceof UploadedFile) {
            if ($path) {
                ProjectImage::deleteStoredFile($path);
            }
            $path = $this->storeImage($file, 'uploads/projects');
        }

        if (! $path) {
            return null;
        }

        $attributes = [
            'image_url' => $path,
            'image_type' => $type,
            'alt_text' => $image['alt_text'] ?? null,
            'caption' => $image['caption'] ?? null,
            'is_cover' => $isCover,
            'sort_order' => (int) ($image['sort_order'] ?? $index),
        ];

        if ($current) {
            $current->update($attributes);
            return $current;
        }

        return $project->images()->create($attributes);
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
