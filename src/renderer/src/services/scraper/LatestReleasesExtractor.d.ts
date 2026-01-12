import { LatestRelease } from '../../types';
import { URLManager } from './URLManager';
import { RateLimiter } from './RateLimiter';
import { ContentValidator } from './ContentValidator';
export declare class LatestReleasesExtractor {
    private static logger;
    private axiosInstance;
    private urlManager;
    private rateLimiter;
    private contentValidator;
    private cache;
    private readonly CACHE_TTL;
    constructor(urlManager: URLManager, rateLimiter: RateLimiter, contentValidator: ContentValidator);
    /**
     * Extract latest releases from manhwaz.com homepage
     */
    extractLatestReleases(page?: number): Promise<LatestRelease[]>;
    /**
     * Parse the latest releases section from the homepage HTML
     */
    private parseLatestReleasesSection;
    /**
     * Parse individual release item from HTML element
     */
    private parseReleaseItem;
    /**
     * Parse date string into Date object
     */
    private parseDate;
    /**
     * Get cached data if it exists and is not expired
     */
    private getCachedData;
    /**
     * Set data in cache with current timestamp
     */
    private setCachedData;
    /**
     * Clear all cached data
     */
    clearCache(): void;
    /**
     * Get placeholder image URL
     */
    private getPlaceholderImage;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
//# sourceMappingURL=LatestReleasesExtractor.d.ts.map