<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Response cache for the public (non-authenticated) API.
 *
 * The public endpoints are read-heavy and rarely change, so their
 * payloads are cached and invalidated whenever the underlying
 * content changes (model events) or via an admin save.
 *
 * Note: uses a shared key prefix instead of cache tags because the
 * configured store (database) does not support tagging.
 */
class PublicCache
{
    /** Cache lifetime for the public API payloads. */
    public const TTL_SECONDS = 86400;

    public const KEY_SETTINGS = 'public-api.settings';
    public const KEY_PROJECTS = 'public-api.projects';
    public const KEY_EXPERIENCES = 'public-api.experiences';
    public const KEY_EDUCATIONS = 'public-api.educations';
    public const KEY_CERTIFICATIONS = 'public-api.certifications';

    private const PREFIX = 'public-api:';

    /**
     * Wrap a public endpoint callback in a cached response.
     *
     * @template T
     *
     * @param  \Closure(): T  $callback
     * @return T
     */
    public static function remember(string $key, \Closure $callback): mixed
    {
        return Cache::remember(self::PREFIX.$key, self::TTL_SECONDS, $callback);
    }

    /** Drop every cached public API payload. */
    public static function flush(): void
    {
        foreach ([
            self::KEY_SETTINGS,
            self::KEY_PROJECTS,
            self::KEY_EXPERIENCES,
            self::KEY_EDUCATIONS,
            self::KEY_CERTIFICATIONS,
        ] as $key) {
            Cache::forget(self::PREFIX.$key);
        }
    }
}
