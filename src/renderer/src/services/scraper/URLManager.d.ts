/**
 * URLManager - Handles manhwaz.com URL validation and construction
 *
 * Provides centralized URL management for manhwaz.com with validation
 * and URL building utilities. Ensures all URLs are properly formatted
 * and belong to the manhwaz.com domain.
 *
 * Requirements: 5.2, 5.3
 */
export declare class URLManager {
    private readonly baseUrl;
    private readonly validHostnames;
    /**
     * Validates if a URL belongs to manhwaz.com domain
     * @param url - URL to validate
     * @returns true if URL is valid manhwaz.com URL
     */
    validateUrl(url: string): boolean;
    /**
     * Builds search URL for manhwaz.com
     * @param query - Search query string
     * @returns Formatted search URL
     */
    buildSearchUrl(query: string): string;
    /**
     * Builds series URL for manhwaz.com
     * @param seriesId - Series identifier or full URL
     * @returns Formatted series URL
     */
    buildSeriesUrl(seriesId: string): string;
    /**
     * Builds chapter URL for manhwaz.com
     * @param chapterId - Chapter identifier or full URL
     * @returns Formatted chapter URL
     */
    buildChapterUrl(chapterId: string): string;
    /**
     * Gets the base URL for manhwaz.com
     * @returns Base URL string
     */
    getBaseUrl(): string;
    /**
     * Builds homepage URL for manhwaz.com
     * @param page - Optional page number
     * @returns Homepage URL
     */
    buildHomepageUrl(page?: number): string;
    /**
     * Extracts series ID from a manhwaz.com series URL
     * @param url - Full series URL
     * @returns Series ID or null if invalid
     */
    extractSeriesId(url: string): string | null;
    /**
     * Extracts chapter ID from a manhwaz.com chapter URL
     * @param url - Full chapter URL
     * @returns Chapter ID or null if invalid
     */
    extractChapterId(url: string): string | null;
    /**
     * Resolves relative URLs to absolute URLs using manhwaz.com base URL
     * @param url - Relative or absolute URL
     * @returns Absolute URL
     */
    resolveUrl(url: string): string;
}
//# sourceMappingURL=URLManager.d.ts.map