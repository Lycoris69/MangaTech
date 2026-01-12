import { SeriesDetails } from '../../types';
import { URLManager } from './URLManager';
import { RateLimiter } from './RateLimiter';
import { ContentValidator } from './ContentValidator';
/**
 * SeriesDetailsExtractor - Extracts comprehensive series details from manhwaz.com series pages
 *
 * This extractor handles:
 * - Extracting comprehensive metadata (title, author, synopsis, genres, status)
 * - Chapter list extraction with complete chapter information
 * - Cover image processing with quality preservation
 * - Handling different page layouts and dynamic content
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export declare class SeriesDetailsExtractor {
    private static logger;
    private axiosInstance;
    private urlManager;
    private rateLimiter;
    private contentValidator;
    private cache;
    private readonly CACHE_TTL;
    constructor(urlManager: URLManager, rateLimiter: RateLimiter, contentValidator: ContentValidator);
    /**
     * Extract comprehensive series details from manhwaz.com series page
     * Implements caching mechanism with 1-hour TTL
     *
     * @param seriesUrl URL of the series page on manhwaz.com
     * @returns Promise<SeriesDetails> Complete series details
     * @throws ScrapingError if extraction fails
     * @throws ValidationError if extracted data is invalid
     */
    extractSeriesDetails(seriesUrl: string): Promise<SeriesDetails>;
    /**
     * Parse the series details page HTML to extract comprehensive metadata
     * Handles various page layouts and dynamic content (Requirement 4.5)
     *
     * @param $ Cheerio instance loaded with series page HTML
     * @param sourceUrl Original URL for reference
     * @returns Promise<SeriesDetails> Parsed series details
     */
    private parseSeriesDetailsPage;
    /**
     * Extract series title from various possible selectors
     */
    private extractTitle;
    /**
     * Extract alternative titles
     */
    private extractAlternativeTitles;
    /**
     * Extract author information
     */
    private extractAuthor;
    /**
     * Extract artist information
     */
    private extractArtist;
    /**
     * Extract synopsis/description
     */
    private extractSynopsis;
    /**
     * Extract and process cover image with quality preservation (Requirement 4.3)
     */
    private extractCoverImage;
    /**
     * Optimize image URL for better quality (Requirement 4.3)
     */
    private optimizeImageUrl;
    /**
     * Extract genres
     */
    private extractGenres;
    /**
     * Extract series status
     */
    private extractStatus;
    /**
     * Extract rating
     */
    private extractRating;
    /**
     * Extract view count
     */
    private extractViewCount;
    /**
     * Extract last updated date
     */
    private extractLastUpdated;
    /**
     * Extract complete chapter list with information (Requirement 4.2)
     */
    private extractChapterList;
    /**
     * Parse individual chapter item from HTML element
     */
    private parseChapterItem;
    /**
     * Parse date string into Date object
     * Handles various date formats commonly used on manga sites
     */
    private parseDate;
    /**
     * Generate unique series ID from URL
     */
    private generateSeriesId;
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
     * Get placeholder image URL for series without cover images
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
//# sourceMappingURL=SeriesDetailsExtractor.d.ts.map