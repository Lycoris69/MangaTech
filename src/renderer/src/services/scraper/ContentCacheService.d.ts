/**
 * ContentCacheService - Intelligent caching system for manhwaz scraper
 *
 * Provides comprehensive caching with:
 * - Intelligent cache invalidation based on content freshness
 * - Image caching and optimization (Abstracted)
 * - Cache warming strategies for frequently accessed content
 * - Memory and persistent caching layers
 * - Performance metrics and monitoring
 *
 * Requirements: Performance optimization for all requirements
 */
import { LatestRelease, HotScan, SeriesDetails, PageData } from '../../types';
import { SearchResponse } from './SearchInterface';
export interface CacheConfig {
    maxMemorySize: number;
    maxDiskSize: number;
    defaultTTL: number;
    imageCacheTTL: number;
    searchCacheTTL: number;
    seriesCacheTTL: number;
    homepageCacheTTL: number;
    enableDiskCache: boolean;
    enableImageOptimization: boolean;
    imageQuality: number;
    maxImageWidth: number;
    maxImageHeight: number;
}
export interface CacheStats {
    memoryUsage: {
        entries: number;
        sizeBytes: number;
        maxSizeBytes: number;
        hitRate: number;
        missRate: number;
    };
    diskUsage: {
        entries: number;
        sizeBytes: number;
        maxSizeBytes: number;
    };
    performance: {
        averageAccessTime: number;
        totalHits: number;
        totalMisses: number;
        totalRequests: number;
    };
}
interface CacheWarmingConfig {
    enabled: boolean;
    warmupInterval: number;
    priorityUrls: string[];
    maxConcurrentWarmups: number;
}
/**
 * Multi-layer caching service with intelligent invalidation
 */
export declare class ContentCacheService {
    private static logger;
    private memoryCache;
    private config;
    private warmingConfig;
    private stats;
    private warmupTimer?;
    private isInitialized;
    constructor(config?: Partial<CacheConfig>, warmingConfig?: Partial<CacheWarmingConfig>);
    /**
     * Initialize cache service
     */
    initialize(): Promise<void>;
    /**
     * Cache latest releases with homepage tag
     */
    cacheLatestReleases(releases: LatestRelease[]): Promise<void>;
    /**
     * Get cached latest releases
     */
    getCachedLatestReleases(): Promise<LatestRelease[] | null>;
    /**
     * Cache hot scans with homepage tag
     */
    cacheHotScans(hotScans: HotScan[]): Promise<void>;
    /**
     * Get cached hot scans
     */
    getCachedHotScans(): Promise<HotScan[] | null>;
    /**
     * Cache search results
     */
    cacheSearchResults(query: string, results: SearchResponse): Promise<void>;
    /**
     * Get cached search results
     */
    getCachedSearchResults(query: string): Promise<SearchResponse | null>;
    /**
     * Cache series details
     */
    cacheSeriesDetails(seriesId: string, details: SeriesDetails): Promise<void>;
    /**
     * Get cached series details
     */
    getCachedSeriesDetails(seriesId: string): Promise<SeriesDetails | null>;
    /**
     * Cache chapter pages
     */
    cacheChapterPages(chapterId: string, pages: PageData[]): Promise<void>;
    /**
     * Get cached chapter pages
     */
    getCachedChapterPages(chapterId: string): Promise<PageData[] | null>;
    /**
     * Cache and optimize image
     */
    cacheImage(imageUrl: string, imageBuffer: Buffer): Promise<string>;
    /**
     * Get cached image path
     */
    getCachedImage(imageUrl: string): Promise<string | null>;
    /**
     * Invalidate cache by key or tags
     */
    invalidateCache(keyOrTag: string): Promise<void>;
    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Warm cache with frequently accessed content
     */
    warmCache(urls?: string[]): Promise<void>;
    /**
     * Generic cache get method
     */
    private get;
    /**
     * Generic cache set method
     */
    private set;
    /**
     * Ensure memory capacity by evicting least recently used entries
     */
    private ensureMemoryCapacity;
    /**
     * Update memory usage statistics
     */
    private updateMemoryStats;
    /**
     * Update performance statistics
     */
    private updatePerformanceStats;
    /**
     * Generate consistent image key from URL
     */
    private generateImageKey;
    /**
     * Normalize search query for consistent caching
     */
    private normalizeSearchQuery;
    /**
     * Start cache warming timer
     */
    private startCacheWarming;
    /**
     * Start periodic cleanup timer
     */
    private startPeriodicCleanup;
    /**
     * Warm a single URL (placeholder for actual implementation)
     */
    private warmSingleUrl;
    /**
     * Utility method to chunk array into smaller arrays
     */
    private chunkArray;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=ContentCacheService.d.ts.map