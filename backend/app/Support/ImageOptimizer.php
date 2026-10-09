<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ImageOptimizer
{
    /** Maximum dimension for large images (hero + gallery). */
    public const MAX_DIMENSION = 1920;

    /** Maximum dimension for small images (logos + badges). */
    public const MAX_DIMENSION_SMALL = 640;

    /** JPEG/WebP encoding quality (0-100). */
    public const QUALITY = 82;

    /** Keep GIF animations intact (thumbnails only). */
    private const THUMBNAIL_MAX_DIMENSION = 400;

    private const THUMBNAIL_QUALITY = 72;

    /** Supported raster image types mapped to safe file extensions. */
    private const SUPPORTED_TYPES = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
        IMAGETYPE_GIF => 'gif',
    ];

    /** Reject decoding of images larger than this (pixels) to avoid memory bombs. */
    public const MAX_PIXELS = 40_000_000;

    /**
     * Optimize an uploaded image and store it on the public disk.
     *
     * The file is validated by its actual contents (not the client extension).
     * Unsupported or malformed images throw a 422 ValidationException instead of
     * being stored unchanged. Returns the stored relative path.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public static function storeOptimized(UploadedFile $file, string $directory, int $maxDimension = self::MAX_DIMENSION): ?string
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $info = @getimagesize($path);

        // Content-based validation: must be a real JPEG/PNG/WebP/GIF.
        if ($info === false || ! isset(self::SUPPORTED_TYPES[$info[2]])) {
            self::reject('The file must be a valid JPEG, PNG, WebP, or GIF image.');
        }

        // Guard against decompression bombs before allocating GD resources.
        $pixels = (int) ($info[0] ?? 0) * (int) ($info[1] ?? 0);
        if ($pixels > self::MAX_PIXELS) {
            self::reject('The image resolution is too large (max 40 megapixels).');
        }

        $extension = self::SUPPORTED_TYPES[$info[2]];

        try {
            // Animated GIFs are stored as-is (re-encoding would drop animation),
            // but with a safe random name and a type-derived extension.
            if ($info[2] === IMAGETYPE_GIF && self::isAnimatedGif($path)) {
                return $file->storeAs($directory, (string) Str::uuid().'.'.$extension, 'public');
            }

            $image = self::create($info[2], $path);

            if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $image = self::applyExifOrientation($image, $path);
            }

            $image = self::resize($image, $maxDimension);

            $filename = (string) Str::uuid();
            $stored = Storage::disk('public')->put($directory.'/'.$filename.'.webp', self::encodeWebp($image));

            imagedestroy($image);

            if (! $stored) {
                throw new RuntimeException('Failed to store optimized image.');
            }

            return $directory.'/'.$filename.'.webp';
        } catch (\Throwable $e) {
            // No fallback: a processing failure is a hard validation error.
            self::reject('The image could not be processed. Please upload a different file.');
        }
    }

    /** Throw a 422 validation error for an invalid/unprocessable image upload. */
    private static function reject(string $message): never
    {
        throw ValidationException::withMessages(['image' => [$message]]);
    }

    /**
     * Optimize an existing stored file (used by the optimize:images command).
     * Returns the new relative path, or null when the file is not a supported
     * raster image or cannot be processed.
     */
    public static function storeOptimizedFromPath(string $storedPath, string $absolutePath, int $maxDimension = self::MAX_DIMENSION): ?string
    {
        $info = @getimagesize($absolutePath);

        if ($info === false || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
            return null;
        }

        // Skip decompression bombs (also protects the maintenance command).
        if ((int) ($info[0] ?? 0) * (int) ($info[1] ?? 0) > self::MAX_PIXELS) {
            return null;
        }

        try {
            $image = self::create($info[2], $absolutePath);

            if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $image = self::applyExifOrientation($image, $absolutePath);
            }

            // Animated GIFs keep their animation and are left as-is.
            if ($info[2] === IMAGETYPE_GIF && self::isAnimatedGif($absolutePath)) {
                imagedestroy($image);
                return null;
            }

            $image = self::resize($image, $maxDimension);

            $directory = dirname($storedPath);
            $filename = (string) Str::uuid();
            $stored = Storage::disk('public')->put($directory.'/'.$filename.'.webp', self::encodeWebp($image));

            imagedestroy($image);

            if (! $stored) {
                throw new RuntimeException('Failed to store optimized image.');
            }

            return $directory.'/'.$filename.'.webp';
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Create a thumbnail variant next to an existing stored image.
     * Returns the relative path of the thumbnail, or null when the image
     * cannot be processed (existing non-webp originals are converted too).
     */
    public static function createThumbnail(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $disk = Storage::disk('public');
        $absolute = $disk->path($path);

        if (str_ends_with(strtolower($path), '.webp')) {
            $image = @imagecreatefromwebp($absolute);
        } else {
            $info = @getimagesize($absolute);
            $image = $info === false ? false : @self::create($info[2], $absolute);
        }

        if ($image === false) {
            return null;
        }

        $image = self::resize($image, self::THUMBNAIL_MAX_DIMENSION);

        $thumbPath = self::thumbnailPathFor($path);

        try {
            $stored = $disk->put($thumbPath, self::encodeWebp($image, self::THUMBNAIL_QUALITY));
        } finally {
            imagedestroy($image);
        }

        return $stored ? $thumbPath : null;
    }

    public static function thumbnailPathFor(string $path): string
    {
        $directory = dirname($path);
        $basename = pathinfo($path, PATHINFO_FILENAME);

        return ($directory === '.' ? '' : $directory.'/').$basename.'-thumb.webp';
    }

    public static function deleteThumbnail(?string $path): void
    {
        if ($path && str_starts_with($path, 'uploads/')) {
            Storage::disk('public')->delete(self::thumbnailPathFor($path));
        }
    }

    private static function create(int $type, string $path)
    {
        return match ($type) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($path),
            IMAGETYPE_PNG => imagecreatefrompng($path),
            IMAGETYPE_WEBP => imagecreatefromwebp($path),
            IMAGETYPE_GIF => imagecreatefromgif($path),
            default => throw new RuntimeException('Unsupported image type.'),
        };
    }

    private static function applyExifOrientation($image, string $path)
    {
        $exif = @exif_read_data($path);
        $orientation = (int) ($exif['Orientation'] ?? 1);

        return match ($orientation) {
            2 => self::flip($image, IMG_FLIP_HORIZONTAL),
            3 => imagerotate($image, 180, 0),
            4 => self::flip($image, IMG_FLIP_VERTICAL),
            5 => imagerotate(self::flip($image, IMG_FLIP_VERTICAL), 90, 0),
            6 => imagerotate($image, -90, 0),
            7 => imagerotate(self::flip($image, IMG_FLIP_VERTICAL), -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };
    }

    private static function flip($image, int $mode)
    {
        return imageflip($image, $mode) ? $image : $image;
    }

    private static function isAnimatedGif(string $path): bool
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }

        $frames = 0;
        while (! feof($handle) && $frames < 2) {
            $chunk = fread($handle, 1024 * 1024);
            if ($chunk === false) {
                break;
            }
            $frames += substr_count($chunk, "\x00\x21\xF9\x04");
        }
        fclose($handle);

        return $frames > 1;
    }

    private static function resize($image, int $maxDimension)
    {
        $width = imagesx($image);
        $height = imagesy($image);

        if ($width <= $maxDimension && $height <= $maxDimension) {
            return $image;
        }

        $scale = min($maxDimension / $width, $maxDimension / $height);
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        return $resized;
    }

    private static function encodeWebp($image, int $quality = self::QUALITY): string
    {
        ob_start();
        imagewebp($image, null, $quality);
        return (string) ob_get_clean();
    }
}
