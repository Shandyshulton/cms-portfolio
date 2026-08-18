<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Project;
use App\Models\ProjectImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()->with(['translations', 'images'])->get();
        $experiences = Experience::query()->get();
        $educations = Education::query()->get();
        $certifications = Certification::query()->get();

        $contentItems = collect()
            ->merge($projects->map(fn (Project $project) => [
                'type' => 'Project',
                'title' => $project->translations->firstWhere('locale', 'id')?->title ?? $project->slug,
                'complete' => $project->translations->contains('locale', 'id') && $project->translations->contains('locale', 'en'),
            ]))
            ->merge($this->jsonTranslationItems('Experience', $experiences, fn (Experience $item) => $item->role))
            ->merge($this->jsonTranslationItems('Education', $educations, fn (Education $item) => $item->institution_name))
            ->merge($this->jsonTranslationItems('Certification', $certifications, fn (Certification $item) => $item->name));

        $totalContent = $contentItems->count();
        $completeContent = $contentItems->where('complete', true)->count();
        $totalImages = ProjectImage::query()->count();
        $imagesWithAlt = ProjectImage::query()->whereNotNull('alt_text')->where('alt_text', '!=', '')->count();

        $bilingualCoverage = $this->percentage($completeContent, $totalContent);
        $imageAltTags = $this->percentage($imagesWithAlt, $totalImages);

        $missingBilingual = $contentItems->where('complete', false)->take(3)->values();
        $tip = $this->buildTip($missingBilingual, $totalImages, $imagesWithAlt);

        return response()->json([
            'metrics' => [
                'projects' => $projects->count(),
                'experiences' => $experiences->count(),
                'certifications' => $certifications->count(),
            ],
            'health' => [
                'bilingual_coverage' => $bilingualCoverage,
                'image_alt_tags' => $imageAltTags,
                'total_content' => $totalContent,
                'complete_content' => $completeContent,
                'total_images' => $totalImages,
                'images_with_alt' => $imagesWithAlt,
                'tip' => $tip,
                'missing_bilingual' => $missingBilingual,
            ],
            'jump_projects' => $projects->sortBy('sort_order')->take(5)->values()->map(fn (Project $project) => [
                'id' => $project->id,
                'title' => $project->translations->firstWhere('locale', 'id')?->title ?? $project->slug,
                'status' => $project->status,
            ]),
        ]);
    }

    private function jsonTranslationItems(string $type, Collection $items, callable $title): Collection
    {
        return $items->map(function ($item) use ($type, $title) {
            $translations = $item->translations ?? [];
            $idDescription = data_get($translations, 'id.description');
            $enDescription = data_get($translations, 'en.description');

            return [
                'type' => $type,
                'title' => $title($item),
                'complete' => filled($idDescription) && filled($enDescription),
            ];
        });
    }

    private function percentage(int $complete, int $total): int
    {
        if ($total === 0) {
            return 100;
        }

        return (int) round(($complete / $total) * 100);
    }

    private function buildTip(Collection $missingBilingual, int $totalImages, int $imagesWithAlt): string
    {
        if ($missingBilingual->isNotEmpty()) {
            $count = $missingBilingual->count();
            return "Add missing ID/EN translations to {$count} content item(s) to improve bilingual coverage.";
        }

        if ($totalImages > $imagesWithAlt) {
            $missingAlt = $totalImages - $imagesWithAlt;
            return "Add alt text to {$missingAlt} project image(s) to improve accessibility and SEO.";
        }

        return 'Portfolio health is complete. Keep content updated as new work is added.';
    }
}
