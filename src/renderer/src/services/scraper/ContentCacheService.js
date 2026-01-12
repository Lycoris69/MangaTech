"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentCacheService = void 0;
const Logger_1 = require("./Logger");
const DEFAULT_CACHE_CONFIG = {
    maxMemorySize: 100, // 100MB
    maxDiskSize: 500, // 500MB
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    imageCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    searchCacheTTL: 10 * 60 * 1000, // 10 minutes
    seriesCacheTTL: 60 * 60 * 1000, // 1 hour
    homepageCacheTTL: 5 * 60 * 1000, // 5 minutes
    enableDiskCache: false, // Disabled by default for now (until Adapter is implemented)
    enableImageOptimization: false, // Disabled (requires sharp/canvas)
    imageQuality: 85,
    maxImageWidth: 800,
    maxImageHeight: 1200
};
const DEFAULT_WARMING_CONFIG = {
    enabled: true,
    warmupInterval: 15 * 60 * 1000, // 15 minutes
    priorityUrls: [],
    maxConcurrentWarmups: 3
};
/**
 * Multi-layer caching service with intelligent invalidation
 */
class ContentCacheService {
    constructor(config = {}, warmingConfig = {}) {
        this.memoryCache = new Map();
        this.isInitialized = false;
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
        this.warmingConfig = { ...DEFAULT_WARMING_CONFIG, ...warmingConfig };
        // Initialize logger
        if (!ContentCacheService.logger) {
            ContentCacheService.logger = Logger_1.Logger.create('content-cache');
        }
        // Initialize statistics
        this.stats = {
            memoryUsage: {
                entries: 0,
                sizeBytes: 0,
                maxSizeBytes: this.config.maxMemorySize * 1024 * 1024,
                hitRate: 0,
                missRate: 0
            },
            diskUsage: {
                entries: 0,
                sizeBytes: 0,
                maxSizeBytes: this.config.maxDiskSize * 1024 * 1024
            },
            performance: {
                averageAccessTime: 0,
                totalHits: 0,
                totalMisses: 0,
                totalRequests: 0
            }
        };
    }
    /**
     * Initialize cache service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Logic for initializing persistent storage would go here
            // For now, we just use memory cache
            // Start cache warming if enabled
            if (this.warmingConfig.enabled) {
                this.startCacheWarming();
            }
            // Start periodic cleanup
            this.startPeriodicCleanup();
            this.isInitialized = true;
            ContentCacheService.logger.info('ContentCacheService initialized', {
                memoryLimit: this.config.maxMemorySize,
                warmingEnabled: this.warmingConfig.enabled
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize ContentCacheService: ${error}`);
        }
    }
    /**
     * Cache latest releases with homepage tag
     */
    async cacheLatestReleases(releases) {
        const key = 'homepage:latest-releases';
        await this.set(key, releases, this.config.homepageCacheTTL, ['homepage', 'latest-releases']);
        ContentCacheService.logger.debug('Cached latest releases', { count: releases.length });
    }
    /**
     * Get cached latest releases
     */
    async getCachedLatestReleases() {
        const key = 'homepage:latest-releases';
        return await this.get(key);
    }
    /**
     * Cache hot scans with homepage tag
     */
    async cacheHotScans(hotScans) {
        const key = 'homepage:hot-scans';
        await this.set(key, hotScans, this.config.homepageCacheTTL, ['homepage', 'hot-scans']);
        ContentCacheService.logger.debug('Cached hot scans', { count: hotScans.length });
    }
    /**
     * Get cached hot scans
     */
    async getCachedHotScans() {
        const key = 'homepage:hot-scans';
        return await this.get(key);
    }
    /**
     * Cache search results
     */
    async cacheSearchResults(query, results) {
        const key = `search:${this.normalizeSearchQuery(query)}`;
        await this.set(key, results, this.config.searchCacheTTL, ['search']);
        ContentCacheService.logger.debug('Cached search results', {
            query,
            resultCount: results.results.length
        });
    }
    /**
     * Get cached search results
     */
    async getCachedSearchResults(query) {
        const key = `search:${this.normalizeSearchQuery(query)}`;
        return await this.get(key);
    }
    /**
     * Cache series details
     */
    async cacheSeriesDetails(seriesId, details) {
        const key = `series:${seriesId}`;
        await this.set(key, details, this.config.seriesCacheTTL, ['series', `series:${seriesId}`]);
        ContentCacheService.logger.debug('Cached series details', { seriesId, title: details.title });
    }
    /**
     * Get cached series details
     */
    async getCachedSeriesDetails(seriesId) {
        const key = `series:${seriesId}`;
        return await this.get(key);
    }
    /**
     * Cache chapter pages
     */
    async cacheChapterPages(chapterId, pages) {
        const key = `chapter:${chapterId}:pages`;
        await this.set(key, pages, this.config.defaultTTL, ['chapter', `chapter:${chapterId}`]);
        ContentCacheService.logger.debug('Cached chapter pages', { chapterId, pageCount: pages.length });
    }
    /**
     * Get cached chapter pages
     */
    async getCachedChapterPages(chapterId) {
        const key = `chapter:${chapterId}:pages`;
        return await this.get(key);
    }
    /**
     * Cache and optimize image
     */
    async cacheImage(imageUrl, imageBuffer) {
        // Return original URL for now as disk caching is disabled
        return imageUrl;
    }
    /**
     * Get cached image path
     */
    async getCachedImage(imageUrl) {
        return null;
    }
    /**
     * Invalidate cache by key or tags
     */
    async invalidateCache(keyOrTag) {
        const keysToDelete = [];
        // Check if it's a direct key
        if (this.memoryCache.has(keyOrTag)) {
            keysToDelete.push(keyOrTag);
        }
        else {
            // Treat as tag and find all entries with this tag
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.tags.includes(keyOrTag)) {
                    keysToDelete.push(key);
                }
            }
        }
        // Delete from memory cache
        for (const key of keysToDelete) {
            this.memoryCache.delete(key);
        }
        this.updateMemoryStats();
        ContentCacheService.logger.info('Invalidated cache entries', {
            keyOrTag,
            deletedCount: keysToDelete.length
        });
    }
    /**
     * Clear expired cache entries
     */
    async clearExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.memoryCache.delete(key);
        }
        this.updateMemoryStats();
        ContentCacheService.logger.debug('Cleared expired cache entries', {
            expiredCount: expiredKeys.length
        });
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return { ...this.stats };
    }
    /**
     * Warm cache with frequently accessed content
     */
    async warmCache(urls = []) {
        const urlsToWarm = urls.length > 0 ? urls : this.warmingConfig.priorityUrls;
        if (urlsToWarm.length === 0) {
            return;
        }
        ContentCacheService.logger.info('Starting cache warming', {
            urlCount: urlsToWarm.length,
            maxConcurrent: this.warmingConfig.maxConcurrentWarmups
        });
        // Process URLs in batches to respect concurrency limits
        const batches = this.chunkArray(urlsToWarm, this.warmingConfig.maxConcurrentWarmups);
        for (const batch of batches) {
            const warmupPromises = batch.map(url => this.warmSingleUrl(url));
            await Promise.allSettled(warmupPromises);
        }
    }
    /**
     * Generic cache get method
     */
    async get(key) {
        const startTime = Date.now();
        this.stats.performance.totalRequests++;
        const entry = this.memoryCache.get(key);
        if (!entry || Date.now() > entry.expiresAt) {
            this.stats.performance.totalMisses++;
            this.updatePerformanceStats(startTime);
            return null;
        }
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.stats.performance.totalHits++;
        this.updatePerformanceStats(startTime);
        return entry.data;
    }
    /**
     * Generic cache set method
     */
    async set(key, data, ttl = this.config.defaultTTL, tags = []) {
        const serializedData = JSON.stringify(data);
        const size = new TextEncoder().encode(serializedData).length;
        // Check memory limits and evict if necessary
        await this.ensureMemoryCapacity(size);
        const entry = {
            key,
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            accessCount: 1,
            lastAccessed: Date.now(),
            size,
            tags
        };
        this.memoryCache.set(key, entry);
        this.updateMemoryStats();
    }
    /**
     * Ensure memory capacity by evicting least recently used entries
     */
    async ensureMemoryCapacity(requiredSize) {
        const maxSize = this.config.maxMemorySize * 1024 * 1024;
        let currentSize = this.stats.memoryUsage.sizeBytes;
        if (currentSize + requiredSize <= maxSize) {
            return;
        }
        // Sort entries by last accessed time (LRU)
        const entries = Array.from(this.memoryCache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        // Evict entries until we have enough space
        for (const [key, entry] of entries) {
            if (currentSize + requiredSize <= maxSize) {
                break;
            }
            this.memoryCache.delete(key);
            currentSize -= entry.size;
            ContentCacheService.logger.debug('Evicted cache entry for memory', {
                key,
                size: entry.size,
                lastAccessed: new Date(entry.lastAccessed)
            });
        }
    }
    /**
     * Update memory usage statistics
     */
    updateMemoryStats() {
        let totalSize = 0;
        for (const entry of this.memoryCache.values()) {
            totalSize += entry.size;
        }
        this.stats.memoryUsage.entries = this.memoryCache.size;
        this.stats.memoryUsage.sizeBytes = totalSize;
        const totalRequests = this.stats.performance.totalRequests;
        if (totalRequests > 0) {
            this.stats.memoryUsage.hitRate = this.stats.performance.totalHits / totalRequests;
            this.stats.memoryUsage.missRate = this.stats.performance.totalMisses / totalRequests;
        }
    }
    /**
     * Update performance statistics
     */
    updatePerformanceStats(startTime) {
        const accessTime = Date.now() - startTime;
        const totalRequests = this.stats.performance.totalRequests;
        this.stats.performance.averageAccessTime =
            (this.stats.performance.averageAccessTime * (totalRequests - 1) + accessTime) / totalRequests;
    }
    /**
     * Generate consistent image key from URL
     */
    generateImageKey(imageUrl) {
        // Simple hash function for generating consistent keys
        let hash = 0;
        for (let i = 0; i < imageUrl.length; i++) {
            const char = imageUrl.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Normalize search query for consistent caching
     */
    normalizeSearchQuery(query) {
        return query.toLowerCase().trim().replace(/\s+/g, '-');
    }
    /**
     * Start cache warming timer
     */
    startCacheWarming() {
        if (this.warmupTimer) {
            clearInterval(this.warmupTimer);
        }
        this.warmupTimer = setInterval(() => {
            this.warmCache().catch(error => {
                ContentCacheService.logger.error('Cache warming failed', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            });
        }, this.warmingConfig.warmupInterval);
    }
    /**
     * Start periodic cleanup timer
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.clearExpiredCache().catch(error => {
                ContentCacheService.logger.error('Periodic cleanup failed', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            });
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    /**
     * Warm a single URL (placeholder for actual implementation)
     */
    async warmSingleUrl(url) {
        // This would be implemented to pre-fetch and cache content from the URL
        // For now, it's a placeholder that logs the warming attempt
        ContentCacheService.logger.debug('Warming cache for URL', { url });
    }
    /**
     * Utility method to chunk array into smaller arrays
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.warmupTimer) {
            clearInterval(this.warmupTimer);
        }
        ContentCacheService.logger.info('ContentCacheService cleanup completed');
    }
}
exports.ContentCacheService = ContentCacheService;
//# sourceMappingURL=ContentCacheService.js.map