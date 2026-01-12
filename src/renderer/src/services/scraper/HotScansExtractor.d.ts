import { HotScan } from '../../types';
import { URLManager } from './URLManager';
import { RateLimiter } from './RateLimiter';
import { ContentValidator } from './ContentValidator';
export declare class HotScansExtractor {
    private static logger;
    private axiosInstance;
    private urlManager;
    private rateLimiter;
    private contentValidator;
    private cache;
    private readonly CACHE_TTL;
    constructor(urlManager: URLManager, rateLimiter: RateLimiter, contentValidator: ContentValidator);
    /**
     * Extract hot scans/trending content from manhwaz.com homepage
     */
    extractHotScans(): Promise<HotScan[]>;
    /**
     * Parse the hot scans/trending section from the homepage HTML
     */
    private parseHotScansSection;
    /**
     * Parse individual hot scan item from HTML element
     */
    private parseHotScanItem;
    /**
     * Parse view count string into number
     */
    private parseViewCount;
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
//# sourceMappingURL=HotScansExtractor.d.ts.map