import { RateLimitConfig, WebScrapingService } from './interfaces';
import { Series, SeriesSearchResult, TrendingContent, PageData } from '../../types';
import { Logger } from './Logger';
import { URLManager } from './URLManager';
import { RateLimiter, RateLimitConfig as TokenBucketConfig } from './RateLimiter';
import { RetryHandler, RetryConfig } from './RetryHandler';
import { ContentValidator } from './ContentValidator';
import { LatestReleasesExtractor } from './LatestReleasesExtractor';
import { HotScansExtractor } from './HotScansExtractor';
import { SearchInterface, SearchOptions, SearchResponse } from './SearchInterface';
import { SeriesDetailsExtractor } from './SeriesDetailsExtractor';
import { ChapterExtractor } from './ChapterExtractor';
import { ContentCacheService } from './ContentCacheService';
import { PerformanceOptimizer } from './PerformanceOptimizer';
interface ManhwazRateLimitConfig extends RateLimitConfig, RetryConfig, TokenBucketConfig {
    requestsPerSecond: number;
    burstLimit: number;
}
/**
 * ManhwazScraper - Specialized scraper for manhwaz.com
 *
 * This scraper implements respectful scraping practices with:
 * - Token bucket rate limiting
 * - Exponential backoff retry logic
 * - Request throttling mechanisms
 * - Comprehensive error handling
 * - Content validation
 */
export declare class ManhwazScraper implements WebScrapingService {
    protected static logger: Logger;
    protected rateLimitConfig: ManhwazRateLimitConfig;
    private rateLimiter;
    private retryHandler;
    private urlManager;
    private contentValidator;
    private axiosInstance;
    private latestReleasesExtractor;
    private hotScansExtractor;
    private searchInterface;
    private seriesDetailsExtractor;
    private chapterExtractor;
    private scrapingMonitor;
    private cacheService;
    private performanceOptimizer;
    constructor();
    /**
     * Initialize the scraper and its services
     */
    private initialize;
    searchSeries(query: string, options?: SearchOptions): Promise<SeriesSearchResult[]>;
    searchSeriesWithDetails(query: string, options?: SearchOptions): Promise<SearchResponse>;
    getAutocompleteSuggestions(partialQuery: string): Promise<import('./SearchInterface').AutocompleteResult[]>;
    getSeriesDetails(seriesId: string): Promise<Series>;
    getLatestReleases(page?: number): Promise<SeriesSearchResult[]>;
    getTrendingContent(): Promise<TrendingContent>;
    getChapterPages(chapterId: string): Promise<PageData[]>;
    validateSource(sourceUrl: string): Promise<boolean>;
    protected makeHttpRequest(url: string): Promise<any>;
    getRateLimitStats(): {
        requestsPerSecond: number;
        burstLimit: number;
        retryAttempts: number;
    };
    getURLManager(): URLManager;
    getRateLimiter(): RateLimiter;
    getRetryHandler(): RetryHandler;
    getContentValidator(): ContentValidator;
    getLatestReleasesExtractor(): LatestReleasesExtractor;
    getHotScansExtractor(): HotScansExtractor;
    getSearchInterface(): SearchInterface;
    getSeriesDetailsExtractor(): SeriesDetailsExtractor;
    getChapterExtractor(): ChapterExtractor;
    getCacheService(): ContentCacheService;
    getPerformanceOptimizer(): PerformanceOptimizer;
    /**
     * Get comprehensive performance and cache statistics
     */
    getPerformanceStats(): {
        rateLimiting: ReturnType<ManhwazScraper['getRateLimitStats']>;
        cache: ReturnType<ContentCacheService['getCacheStats']>;
        performance: ReturnType<PerformanceOptimizer['getMetrics']>;
        queue: ReturnType<PerformanceOptimizer['getQueueStats']>;
    };
    /**
     * Invalidate cache for specific content types
     */
    invalidateCache(type: 'homepage' | 'search' | 'series' | 'chapter' | string): Promise<void>;
    /**
     * Warm cache with priority content
     */
    warmCache(urls?: string[]): Promise<void>;
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=ManhwazScraper.d.ts.map