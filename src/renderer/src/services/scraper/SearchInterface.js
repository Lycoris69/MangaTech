"use strict";
/**
 * SearchInterface - Handles manhwaz.com search functionality
 *
 * Implements search endpoint querying, result parsing with metadata extraction,
 * autocomplete functionality, and empty result handling.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchInterface = void 0;
const cheerio = __importStar(require("cheerio"));
const interfaces_1 = require("./interfaces");
const axios_1 = __importDefault(require("axios"));
const Logger_1 = require("./Logger");
class SearchInterface {
    constructor(urlManager, rateLimiter, contentValidator) {
        this.urlManager = urlManager;
        this.rateLimiter = rateLimiter;
        this.contentValidator = contentValidator;
        // Initialize logger
        if (!SearchInterface.logger) {
            SearchInterface.logger = Logger_1.Logger.create('search-interface');
        }
        // Configure axios instance
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
    }
    /**
     * Search for manga series on manhwaz.com
     * Requirement 3.2: Query manhwaz.com and return relevant manga results
     */
    async searchSeries(query, options = {}) {
        if (!query || query.trim().length === 0) {
            throw new interfaces_1.ValidationError('Search query cannot be empty');
        }
        const trimmedQuery = query.trim();
        SearchInterface.logger.info('Searching series', { query: trimmedQuery, options });
        try {
            // Acquire rate limiting token
            await this.rateLimiter.acquireToken();
            // Build search URL
            const searchUrl = this.urlManager.buildSearchUrl(trimmedQuery);
            // Make HTTP request
            const response = await this.axiosInstance.get(searchUrl);
            const $ = cheerio.load(response.data);
            // Parse search results
            const results = this.parseSearchResults($, trimmedQuery);
            // Apply filters and sorting
            const filteredResults = this.applyFiltersAndSorting(results, options);
            // Extract autocomplete suggestions
            const suggestions = this.extractAutocompleteSuggestions($, trimmedQuery);
            // Handle pagination
            const totalCount = this.extractTotalCount($);
            const hasMore = this.checkHasMore($, filteredResults.length, options);
            const searchResponse = {
                results: filteredResults,
                totalCount,
                hasMore,
                suggestions,
                query: trimmedQuery
            };
            // Validate response
            this.validateSearchResponse(searchResponse);
            SearchInterface.logger.info('Search completed', {
                query: trimmedQuery,
                resultCount: filteredResults.length,
                totalCount,
                hasMore
            });
            return searchResponse;
        }
        catch (error) {
            SearchInterface.logger.error('Search failed', {
                query: trimmedQuery,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof interfaces_1.ValidationError) {
                throw error;
            }
            throw new interfaces_1.ScrapingError(`Search failed for query "${trimmedQuery}": ${error instanceof Error ? error.message : 'Unknown error'}`, 'SEARCH_FAILED');
        }
    }
    /**
     * Get autocomplete suggestions for search queries
     * Requirement 3.5: Provide autocomplete suggestions based on manhwaz.com search data
     */
    async getAutocompleteSuggestions(partialQuery) {
        if (!partialQuery || partialQuery.trim().length < 2) {
            return [];
        }
        const trimmedQuery = partialQuery.trim();
        SearchInterface.logger.debug('Getting autocomplete suggestions', { query: trimmedQuery });
        try {
            // Acquire rate limiting token
            await this.rateLimiter.acquireToken();
            // Build autocomplete URL (manhwaz.com might have an autocomplete endpoint)
            const autocompleteUrl = `${this.urlManager.getBaseUrl()}/wp-json/wp/v2/search?search=${encodeURIComponent(trimmedQuery)}&per_page=10`;
            try {
                const response = await this.axiosInstance.get(autocompleteUrl);
                return this.parseAutocompleteResponse(response.data, trimmedQuery);
            }
            catch (autocompleteError) {
                // Fallback: perform a regular search and extract suggestions
                SearchInterface.logger.debug('Autocomplete endpoint failed, falling back to search', {
                    query: trimmedQuery,
                    error: autocompleteError instanceof Error ? autocompleteError.message : 'Unknown error'
                });
                const searchResponse = await this.searchSeries(trimmedQuery, { limit: 5 });
                return this.generateSuggestionsFromResults(searchResponse.results, trimmedQuery);
            }
        }
        catch (error) {
            SearchInterface.logger.warn('Autocomplete failed', {
                query: trimmedQuery,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    /**
     * Parse search results from manhwaz.com HTML
     * Requirement 3.3: Show series titles, cover images, authors, and brief descriptions
     */
    parseSearchResults($, query) {
        const results = [];
        // manhwaz.com search results are typically in a grid or list format
        // Common selectors for manga sites:
        const resultSelectors = [
            '.page-item-detail',
            '.search-results .manga-item',
            '.manga-list .manga-item',
            '.search-item',
            '.series-item',
            '.post-item',
            '.wp-manga-item'
        ];
        let $results = null;
        // Try different selectors to find search results
        for (const selector of resultSelectors) {
            $results = $(selector);
            if ($results.length > 0) {
                SearchInterface.logger.debug(`Found search results with selector: ${selector}`, { count: $results.length });
                break;
            }
        }
        if (!$results || $results.length === 0) {
            SearchInterface.logger.warn('No search results found with known selectors');
            return results;
        }
        $results.each((index, element) => {
            try {
                const $item = $(element);
                // Extract basic information
                const titleElement = $item.find('.post-title a, h3 a, h2 a, .title a, .manga-title a').first();
                let title = titleElement.text().trim() || titleElement.attr('title')?.trim() || '';
                // Fallback for title if element text is empty
                if (!title) {
                    const altLink = $item.find('a[title]').first();
                    title = altLink.attr('title')?.trim() || altLink.text().trim() || '';
                }
                if (!title) {
                    SearchInterface.logger.debug('Skipping result with no title', { index });
                    return;
                }
                // Extract series URL
                const seriesUrl = this.urlManager.resolveUrl(titleElement.attr('href') || '');
                if (!seriesUrl || !this.urlManager.validateUrl(seriesUrl)) {
                    SearchInterface.logger.debug('Skipping result with invalid URL', { index, title, url: seriesUrl });
                    return;
                }
                // Extract cover image
                const imgElement = $item.find('.item-thumb img, .manga-thumb img, img').first();
                const coverImageUrl = this.urlManager.resolveUrl(imgElement.attr('src') ||
                    imgElement.attr('data-src') ||
                    imgElement.attr('data-lazy-src') ||
                    '');
                // Extract author
                const authorElement = $item.find('.author, .manga-author, .post-author, .by-author');
                let author = authorElement.text().trim();
                if (author.startsWith('By ') || author.startsWith('Author: ')) {
                    author = author.replace(/^(By |Author: )/, '');
                }
                if (!author) {
                    author = 'Unknown';
                }
                // Extract synopsis/description
                const synopsisElement = $item.find('.summary, .description, .excerpt, .manga-excerpt');
                const synopsis = synopsisElement.text().trim() || '';
                // Extract genres
                const genreElements = $item.find('.genres a, .genre a, .manga-genres a');
                const genres = [];
                genreElements.each((_, genreEl) => {
                    const genre = $(genreEl).text().trim();
                    if (genre) {
                        genres.push(genre);
                    }
                });
                // Extract status
                const statusElement = $item.find('.status, .manga-status');
                const statusText = statusElement.text().trim().toLowerCase();
                let status = 'ongoing';
                if (statusText.includes('completed') || statusText.includes('finished')) {
                    status = 'completed';
                }
                else if (statusText.includes('hiatus') || statusText.includes('on hold')) {
                    status = 'hiatus';
                }
                // Extract rating
                const ratingElement = $item.find('.rating, .score, .manga-rating');
                let rating = 0;
                const ratingText = ratingElement.text().trim();
                const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                if (ratingMatch) {
                    rating = parseFloat(ratingMatch[1]);
                    // Normalize to 0-10 scale if needed
                    if (rating > 10) {
                        rating = rating / 10;
                    }
                }
                // Generate unique ID from URL
                const id = this.urlManager.extractSeriesId(seriesUrl) ||
                    seriesUrl.split('/').pop() ||
                    `search-${Date.now()}-${index}`;
                // Extract latest chapter
                const chapterElement = $item.find('.chapter, .chapter-item, .latest-chapter, span.chapter').first();
                let latestChapter = chapterElement.text().trim();
                // Clean up chapter text: Remove "Chapter", "Ch.", and just keep the number
                latestChapter = latestChapter.replace(/^(Chapter|Ch\.|Ch)\s*/i, '').trim();
                // Remove any trailng date text if it leaked through (e.g. "123 2 hours ago")
                latestChapter = latestChapter.replace(/\s+\d+\s+(hour|minute|day|week|month|year)s?\s+ago$/i, '');
                // Extract last updated date
                // Use selectors similar to LatestReleasesExtractor
                const dateSelectors = ['.post-on', '.date', '.publish-date', '.updated', '.time', '.chapter-date', '.meta-date'];
                let lastUpdated = undefined;
                for (const selector of dateSelectors) {
                    const dateElement = $item.find(selector).first();
                    if (dateElement.length > 0) {
                        const dateText = dateElement.text().trim();
                        lastUpdated = this.parseRelativeDate(dateText);
                        if (lastUpdated)
                            break;
                    }
                }
                // Fallback: Check for relative time in specific elements if standard parsing failed
                // Fallback: Check for relative time in specific elements if standard parsing failed
                if (!lastUpdated) {
                    const timeElement = $item.find('span.time, span.date').first();
                    // Try to parse from time element
                    if (timeElement.length > 0) {
                        lastUpdated = this.parseRelativeDate(timeElement.text());
                    }
                    // If still not found, check the full text (last resort)
                    if (!lastUpdated) {
                        const fullText = $item.text();
                        const relativeMatch = fullText.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i);
                        if (relativeMatch) {
                            lastUpdated = this.parseRelativeDate(relativeMatch[0]);
                        }
                    }
                }
                const result = {
                    id,
                    title,
                    author,
                    coverImageUrl,
                    synopsis,
                    genres,
                    status,
                    rating,
                    sourceUrl: seriesUrl,
                    latestChapter,
                    lastUpdated
                };
                // Validate result
                if (this.contentValidator.validateSearchResult(result)) {
                    results.push(result);
                    SearchInterface.logger.debug('Parsed search result', { title, author, genres: genres.length });
                }
                else {
                    SearchInterface.logger.debug('Search result failed validation', { title, author });
                }
            }
            catch (error) {
                SearchInterface.logger.warn('Failed to parse search result item', {
                    index,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        SearchInterface.logger.info('Parsed search results', {
            query,
            totalParsed: results.length,
            totalFound: $results.length
        });
        return results;
    }
    /**
     * Extract autocomplete suggestions from search page
     */
    extractAutocompleteSuggestions($, query) {
        const suggestions = [];
        // Extract popular searches or related terms if available
        const popularSearches = $('.popular-searches a, .trending-searches a, .related-searches a');
        popularSearches.each((_, element) => {
            const suggestion = $(element).text().trim();
            if (suggestion && suggestion.toLowerCase() !== query.toLowerCase()) {
                suggestions.push({
                    suggestion,
                    type: 'series'
                });
            }
        });
        // Extract genre suggestions
        const genreLinks = $('.genre-filter a, .genres a, .manga-genres a');
        genreLinks.each((_, element) => {
            const genre = $(element).text().trim();
            if (genre && genre.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({
                    suggestion: genre,
                    type: 'genre'
                });
            }
        });
        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }
    /**
     * Parse autocomplete API response
     */
    parseAutocompleteResponse(data, query) {
        const suggestions = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.title && typeof item.title === 'string') {
                    suggestions.push({
                        suggestion: item.title,
                        type: 'series'
                    });
                }
            }
        }
        return suggestions.slice(0, 10);
    }
    /**
     * Generate suggestions from search results
     */
    generateSuggestionsFromResults(results, query) {
        const suggestions = [];
        // Add series titles as suggestions
        for (const result of results.slice(0, 5)) {
            if (result.title.toLowerCase() !== query.toLowerCase()) {
                suggestions.push({
                    suggestion: result.title,
                    type: 'series'
                });
            }
        }
        // Add unique authors as suggestions
        const authors = new Set();
        for (const result of results) {
            if (result.author && result.author !== 'Unknown' &&
                result.author.toLowerCase().includes(query.toLowerCase())) {
                authors.add(result.author);
            }
        }
        for (const author of Array.from(authors).slice(0, 3)) {
            suggestions.push({
                suggestion: author,
                type: 'author'
            });
        }
        // Add unique genres as suggestions
        const genres = new Set();
        for (const result of results) {
            for (const genre of result.genres) {
                if (genre.toLowerCase().includes(query.toLowerCase())) {
                    genres.add(genre);
                }
            }
        }
        for (const genre of Array.from(genres).slice(0, 3)) {
            suggestions.push({
                suggestion: genre,
                type: 'genre'
            });
        }
        return suggestions;
    }
    /**
     * Apply filters and sorting to search results
     */
    applyFiltersAndSorting(results, options) {
        let filteredResults = [...results];
        // Apply filters
        if (options.filterBy) {
            const { genres, status, minRating } = options.filterBy;
            if (genres && genres.length > 0) {
                filteredResults = filteredResults.filter(result => genres.some(genre => result.genres.some(resultGenre => resultGenre.toLowerCase().includes(genre.toLowerCase()))));
            }
            if (status) {
                filteredResults = filteredResults.filter(result => result.status === status);
            }
            if (minRating !== undefined) {
                filteredResults = filteredResults.filter(result => result.rating >= minRating);
            }
        }
        // Apply sorting
        if (options.sortBy) {
            switch (options.sortBy) {
                case 'title':
                    filteredResults.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'rating':
                    filteredResults.sort((a, b) => b.rating - a.rating);
                    break;
                case 'updated':
                    // For search results, we don't have update dates, so maintain original order
                    break;
                case 'relevance':
                default:
                    // Results are already in relevance order from the search
                    break;
            }
        }
        // Apply pagination
        const offset = options.offset || 0;
        const limit = options.limit || filteredResults.length;
        return filteredResults.slice(offset, offset + limit);
    }
    /**
     * Extract total count from search page
     */
    extractTotalCount($) {
        // Look for total count indicators
        const countSelectors = [
            '.search-count',
            '.results-count',
            '.total-results',
            '.found-results'
        ];
        for (const selector of countSelectors) {
            const countElement = $(selector);
            if (countElement.length > 0) {
                const countText = countElement.text();
                const countMatch = countText.match(/(\d+)/);
                if (countMatch) {
                    return parseInt(countMatch[1], 10);
                }
            }
        }
        // Fallback: count visible results
        const resultSelectors = [
            '.search-results .manga-item',
            '.manga-list .manga-item',
            '.search-item',
            '.series-item'
        ];
        for (const selector of resultSelectors) {
            const results = $(selector);
            if (results.length > 0) {
                return results.length;
            }
        }
        return 0;
    }
    /**
     * Check if there are more results available
     */
    checkHasMore($, currentCount, options) {
        // Look for pagination indicators
        const paginationSelectors = [
            '.pagination .next',
            '.page-numbers .next',
            '.nav-links .next',
            '.wp-pagenavi .next'
        ];
        for (const selector of paginationSelectors) {
            if ($(selector).length > 0) {
                return true;
            }
        }
        // Check if we have a limit and got exactly that many results
        if (options.limit && currentCount >= options.limit) {
            return true;
        }
        return false;
    }
    /**
     * Parse relative date string to Date object
     * Supports specific formats like "2 hours ago", "1 day ago", etc.
     */
    parseRelativeDate(dateText) {
        if (!dateText)
            return undefined;
        const now = new Date();
        const text = dateText.toLowerCase().trim();
        // Handle "just now" or similar
        if (text.includes('now') || text.includes('moment')) {
            return now;
        }
        // specific relative format parser
        const relativeMatch = text.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
        if (relativeMatch) {
            const value = parseInt(relativeMatch[1], 10);
            const unit = relativeMatch[2];
            const date = new Date(now);
            switch (unit) {
                case 'minute':
                    date.setMinutes(now.getMinutes() - value);
                    break;
                case 'hour':
                    date.setHours(now.getHours() - value);
                    break;
                case 'day':
                    date.setDate(now.getDate() - value);
                    break;
                case 'week':
                    date.setDate(now.getDate() - value * 7);
                    break;
                case 'month':
                    date.setMonth(now.getMonth() - value);
                    break;
                case 'year':
                    date.setFullYear(now.getFullYear() - value);
                    break;
            }
            return date;
        }
        // Try parsing as absolute date
        const absoluteDate = new Date(dateText);
        if (!isNaN(absoluteDate.getTime())) {
            return absoluteDate;
        }
        return undefined;
    }
    /**
     * Validate search response
     */
    validateSearchResponse(response) {
        if (!response.query || response.query.trim().length === 0) {
            throw new interfaces_1.ValidationError('Search response must have a valid query');
        }
        if (!Array.isArray(response.results)) {
            throw new interfaces_1.ValidationError('Search response must have results array');
        }
        if (typeof response.totalCount !== 'number' || response.totalCount < 0) {
            throw new interfaces_1.ValidationError('Search response must have valid total count');
        }
        if (typeof response.hasMore !== 'boolean') {
            throw new interfaces_1.ValidationError('Search response must have valid hasMore flag');
        }
        if (!Array.isArray(response.suggestions)) {
            throw new interfaces_1.ValidationError('Search response must have suggestions array');
        }
        // Validate each result
        for (const result of response.results) {
            if (!this.contentValidator.validateSearchResult(result)) {
                throw new interfaces_1.ValidationError(`Invalid search result: ${result.title || 'Unknown'}`);
            }
        }
    }
    /**
     * Handle empty search results with appropriate messaging
     * Requirement 3.4: Display appropriate messaging and suggest alternative searches
     */
    generateEmptyResultsMessage(query, suggestions) {
        let message = `No results found for "${query}".`;
        if (suggestions.length > 0) {
            const suggestionTexts = suggestions.slice(0, 3).map(s => s.suggestion);
            message += ` Try searching for: ${suggestionTexts.join(', ')}`;
        }
        else {
            message += ' Try using different keywords or check your spelling.';
        }
        return message;
    }
}
exports.SearchInterface = SearchInterface;
//# sourceMappingURL=SearchInterface.js.map