/**
 * SearchInterface - Handles manhwaz.com search functionality
 *
 * Implements search endpoint querying, result parsing with metadata extraction,
 * autocomplete functionality, and empty result handling.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
import { SeriesSearchResult } from '../../types';
import { URLManager } from './URLManager';
import { RateLimiter } from './RateLimiter';
import { ContentValidator } from './ContentValidator';
export interface SearchOptions {
    limit?: number;
    offset?: number;
    sortBy?: 'relevance' | 'title' | 'rating' | 'updated';
    filterBy?: {
        genres?: string[];
        status?: 'ongoing' | 'completed' | 'hiatus';
        minRating?: number;
    };
}
export interface AutocompleteResult {
    suggestion: string;
    type: 'series' | 'author' | 'genre';
    count?: number;
}
export interface SearchResponse {
    results: SeriesSearchResult[];
    totalCount: number;
    hasMore: boolean;
    suggestions: AutocompleteResult[];
    query: string;
}
export declare class SearchInterface {
    private static logger;
    private urlManager;
    private rateLimiter;
    private contentValidator;
    private axiosInstance;
    constructor(urlManager: URLManager, rateLimiter: RateLimiter, contentValidator: ContentValidator);
    /**
     * Search for manga series on manhwaz.com
     * Requirement 3.2: Query manhwaz.com and return relevant manga results
     */
    searchSeries(query: string, options?: SearchOptions): Promise<SearchResponse>;
    /**
     * Get autocomplete suggestions for search queries
     * Requirement 3.5: Provide autocomplete suggestions based on manhwaz.com search data
     */
    getAutocompleteSuggestions(partialQuery: string): Promise<AutocompleteResult[]>;
    /**
     * Parse search results from manhwaz.com HTML
     * Requirement 3.3: Show series titles, cover images, authors, and brief descriptions
     */
    private parseSearchResults;
    /**
     * Extract autocomplete suggestions from search page
     */
    private extractAutocompleteSuggestions;
    /**
     * Parse autocomplete API response
     */
    private parseAutocompleteResponse;
    /**
     * Generate suggestions from search results
     */
    private generateSuggestionsFromResults;
    /**
     * Apply filters and sorting to search results
     */
    private applyFiltersAndSorting;
    /**
     * Extract total count from search page
     */
    private extractTotalCount;
    /**
     * Check if there are more results available
     */
    private checkHasMore;
    /**
     * Parse relative date string to Date object
     * Supports specific formats like "2 hours ago", "1 day ago", etc.
     */
    private parseRelativeDate;
    /**
     * Validate search response
     */
    private validateSearchResponse;
    /**
     * Handle empty search results with appropriate messaging
     * Requirement 3.4: Display appropriate messaging and suggest alternative searches
     */
    generateEmptyResultsMessage(query: string, suggestions: AutocompleteResult[]): string;
}
//# sourceMappingURL=SearchInterface.d.ts.map