<?php

namespace App\Console\Commands;

use App\Models\ProjectImage;
use App\Support\ImageOptimizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class OptimizeImages extends Command
{
    protected $signature = 'optimize:images {--dry-run : Report what would change without modifying files}';

    protected $description = 'Re-optimize existing uploaded images (WebP + resize) and generate thumbnails';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $dryRun = (bool) $this->option('dry-run');
        $converted = 0;
        $thumbnails = 0;
        $skipped = 0;
        $failed = 0;

        $images = ProjectImage::query()
            ->where('image_url', 'not like', 'http://%')
            ->where('image_url', 'not like', 'https://%')
            ->get();

        $this->line("Processing {$images->count()} project images...");

        foreach ($images as $image) {
            $path = $image->getRawOriginal('image_url');

            if (! $path || ! $disk->exists($path)) {
                $skipped++;
                continue;
            }

            $isWebp = str_ends_with(strtolower($path), '.webp');

            try {
                if ($dryRun) {
                    if (! $isWebp) {
                        $converted++;
                        $this->line("  [dry-run] would convert: {$path}");
                    }
                    continue;
                }

                if (! $isWebp) {
                    $optimized = ImageOptimizer::storeOptimizedFromPath($path, $disk->path($path));

                    if ($optimized === null) {
                        $skipped++;
                        continue;
                    }

                    $image->update(['image_url' => $optimized]);
                    $disk->delete($path);
                    $converted++;
                    $this->line("  converted: {$path} -> {$optimized}");
                }

                $thumbnail = ImageOptimizer::createThumbnail($image->getRawOriginal('image_url'));
                if ($thumbnail) {
                    $thumbnails++;
                }
            } catch (\Throwable $e) {
                $failed++;
                $this->error("  failed: {$path} ({$e->getMessage()})");
            }
        }

        $this->newLine();
        $this->info($dryRun
            ? "Dry run complete: {$converted} to convert, {$skipped} skipped, {$failed} failed."
            : "Done: {$converted} converted, {$thumbnails} thumbnails generated, {$skipped} skipped, {$failed} failed.");

        return self::SUCCESS;
    }
}
