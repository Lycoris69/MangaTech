import { PageData } from '../../types';
import { URLManager } from './URLManager';
import { RateLimiter } from './RateLimiter';
import { ContentValidator } from './ContentValidator';
/**
 * ChapterExtractor - Extracts page URLs from manhwaz.com chapter pages
 *
 * This extractor handles:
 * - Extracting all page URLs in correct reading order
 * - Handling different image formats and resolutions
 * - Implementing page validation and quality checks
 * - Processing dynamic content loading for JavaScript-rendered elements
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export declare class ChapterExtractor {
    private static logger;
    private axiosInstance;
    private urlManager;
    private rateLimiter;
    private contentValidator;
    private cache;
    private readonly CACHE_TTL;
    constructor(urlManager: URLManager, rateLimiter: RateLimiter, contentValidator: ContentValidator);
    /**
     * Extract all page URLs from a chapter page (Requirement 7.1, 7.2)
     * @param chapterUrl - URL of the chapter page
     * @returns Array of PageData objects in correct reading order
     */
    extractChapterPages(chapterUrl: string): Promise<PageData[]>;
    /**
     * Extract page URLs from chapter HTML using multiple selectors (Requirement 7.1)
     * @param $ - Cheerio instance with loaded HTML
     * @param chapterUrl - Original chapter URL for context
     * @returns Array of objects with page URLs and alt text
     */
    private extractPageUrls;
    /**
     * Sort page URLs by their order in the DOM to maintain correct reading order
     * @param $ - Cheerio instance
     * @param pageUrls - Array of page URL objects to sort
     * @returns Sorted array of page URL objects
     */
    private sortPagesByOrder;
    /**
     * Validate and process extracted page URLs (Requirement 7.3)
     * @param pageUrls - Array of page URL objects with alt text
     * @returns Array of validated PageData objects
     */
    private validateAndProcessPages;
    /**
     * Check if a URL is a valid image URL
     * @param url - URL to check
     * @returns true if URL appears to be a valid image URL
     */
    private isValidImageUrl;
    /**
     * Validate that an image URL is accessible and returns valid image content
     * @param imageUrl - URL to validate
     * @returns true if image is accessible and valid
     */
    private validateImageUrl;
    /**
     * Get image dimensions if possible (Requirement 7.3)
     * @param imageUrl - URL of the image
     * @returns Object with width and height if available
     */
    private getImageDimensions;
    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void;
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats(): {
        size: number;
        ttl: number;
    };
    /**
     * Clear all cached data
     */
    clearCache(): void;
}
//# sourceMappingURL=ChapterExtractor.d.ts.map