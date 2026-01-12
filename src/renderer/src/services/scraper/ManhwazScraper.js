"use strict";
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
exports.ManhwazScraper = void 0;
const interfaces_1 = require("./interfaces");
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
const Logger_1 = require("./Logger");
const URLManager_1 = require("./URLManager");
const RateLimiter_1 = require("./RateLimiter");
const RetryHandler_1 = require("./RetryHandler");
const ContentValidator_1 = require("./ContentValidator");
const LatestReleasesExtractor_1 = require("./LatestReleasesExtractor");
const HotScansExtractor_1 = require("./HotScansExtractor");
const SearchInterface_1 = require("./SearchInterface");
const SeriesDetailsExtractor_1 = require("./SeriesDetailsExtractor");
const ChapterExtractor_1 = require("./ChapterExtractor");
const ScrapingMonitor_1 = require("./ScrapingMonitor");
const ContentCacheService_1 = require("./ContentCacheService");
const PerformanceOptimizer_1 = require("./PerformanceOptimizer");
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
class ManhwazScraper {
    constructor() {
        // Configure rate limiting for manhwaz.com (Requirements 5.1, 5.4)
        this.rateLimitConfig = {
            requestsPerSecond: 1, // Conservative rate to respect server resources
            burstLimit: 3,
            retryAttempts: 3, // mapped to maxAttempts
            retryDelay: 2000,
            maxAttempts: 3, // extra property for RetryConfig
            baseDelay: 2000, // 2 second base delay
            backoffMultiplier: 2,
            maxDelay: 30000, // 30 second max delay
            jitterEnabled: true
        };
        this.rateLimiter = new RateLimiter_1.RateLimiter({
            requestsPerSecond: this.rateLimitConfig.requestsPerSecond,
            burstLimit: this.rateLimitConfig.burstLimit,
            maxWaitTime: this.rateLimitConfig.maxDelay
        });
        this.retryHandler = new RetryHandler_1.RetryHandler({
            maxAttempts: this.rateLimitConfig.maxAttempts,
            baseDelay: this.rateLimitConfig.baseDelay,
            backoffMultiplier: this.rateLimitConfig.backoffMultiplier,
            maxDelay: this.rateLimitConfig.maxDelay,
            jitterEnabled: this.rateLimitConfig.jitterEnabled
        });
        this.urlManager = new URLManager_1.URLManager();
        this.contentValidator = new ContentValidator_1.ContentValidator();
        this.latestReleasesExtractor = new LatestReleasesExtractor_1.LatestReleasesExtractor(this.urlManager, this.rateLimiter, this.contentValidator);
        this.hotScansExtractor = new HotScansExtractor_1.HotScansExtractor(this.urlManager, this.rateLimiter, this.contentValidator);
        this.searchInterface = new SearchInterface_1.SearchInterface(this.urlManager, this.rateLimiter, this.contentValidator);
        this.seriesDetailsExtractor = new SeriesDetailsExtractor_1.SeriesDetailsExtractor(this.urlManager, this.rateLimiter, this.contentValidator);
        this.chapterExtractor = new ChapterExtractor_1.ChapterExtractor(this.urlManager, this.rateLimiter, this.contentValidator);
        // Initialize monitoring system
        this.scrapingMonitor = ScrapingMonitor_1.scrapingMonitor;
        // Initialize caching and performance optimization
        this.cacheService = new ContentCacheService_1.ContentCacheService();
        this.performanceOptimizer = new PerformanceOptimizer_1.PerformanceOptimizer(this.rateLimiter);
        // Initialize logger
        if (!ManhwazScraper.logger) {
            ManhwazScraper.logger = Logger_1.Logger.create('manhwaz-scraper');
        }
        // Configure axios instance with rate limiting
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        // Add request interceptor for rate limiting
        this.axiosInstance.interceptors.request.use(async (config) => {
            await this.rateLimiter.acquireToken();
            ManhwazScraper.logger.debug('Making HTTP request', { url: config.url });
            return config;
        });
        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use((response) => response, (error) => {
            ManhwazScraper.logger.error('HTTP request failed', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message
            });
            return Promise.reject(error);
        });
        // Initialize services
        this.initialize();
    }
    /**
     * Initialize the scraper and its services
     */
    async initialize() {
        try {
            await this.cacheService.initialize();
            ManhwazScraper.logger.info('ManhwazScraper initialized successfully');
        }
        catch (error) {
            ManhwazScraper.logger.error('Failed to initialize ManhwazScraper', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async searchSeries(query, options) {
        if (!query.trim()) {
            throw new interfaces_1.ValidationError('Search query cannot be empty');
        }
        ManhwazScraper.logger.info('Searching series', { query, options });
        const operation = {
            operationName: 'searchSeries',
            url: this.urlManager.buildSearchUrl(query),
            execute: async () => {
                const searchResponse = await this.searchInterface.searchSeries(query, options);
                return searchResponse.results;
            }
        };
        const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000);
        if (!result.success) {
            throw result.error || new interfaces_1.ScrapingError('Search operation failed');
        }
        return result.result;
    }
    async searchSeriesWithDetails(query, options) {
        if (!query.trim()) {
            throw new interfaces_1.ValidationError('Search query cannot be empty');
        }
        ManhwazScraper.logger.info('Searching series with details', { query, options });
        // Check cache first
        const cached = await this.cacheService.getCachedSearchResults(query);
        if (cached) {
            ManhwazScraper.logger.debug('Returning cached search results', {
                query,
                resultCount: cached.results.length
            });
            return cached;
        }
        return await this.retryHandler.executeWithRetry(async () => {
            const searchResponse = await this.searchInterface.searchSeries(query, options);
            // Cache the results
            await this.cacheService.cacheSearchResults(query, searchResponse);
            return searchResponse;
        }, `search with details: ${query}`);
    }
    async getAutocompleteSuggestions(partialQuery) {
        if (!partialQuery.trim()) {
            return [];
        }
        ManhwazScraper.logger.info('Getting autocomplete suggestions', { query: partialQuery });
        return await this.retryHandler.executeWithRetry(async () => {
            return await this.searchInterface.getAutocompleteSuggestions(partialQuery);
        }, `autocomplete: ${partialQuery}`);
    }
    async getSeriesDetails(seriesId) {
        if (!seriesId.trim()) {
            throw new interfaces_1.ValidationError('Series ID cannot be empty');
        }
        // Check cache first
        const cached = await this.cacheService.getCachedSeriesDetails(seriesId);
        if (cached) {
            ManhwazScraper.logger.debug('Returning cached series details', {
                seriesId,
                title: cached.title
            });
            // Convert SeriesDetails to Series format for compatibility
            return {
                id: cached.id,
                title: cached.title,
                author: cached.author,
                synopsis: cached.synopsis,
                coverImageUrl: cached.coverImageUrl,
                genres: cached.genres,
                status: cached.status,
                rating: cached.rating,
                totalChapters: cached.chapters.length,
                lastUpdated: cached.lastUpdated,
                sourceUrl: cached.sourceUrl,
                chapters: cached.chapters
            };
        }
        const seriesUrl = this.urlManager.buildSeriesUrl(seriesId);
        ManhwazScraper.logger.info('Getting series details', { seriesId, url: seriesUrl });
        const operation = {
            operationName: 'getSeriesDetails',
            url: seriesUrl,
            execute: async () => {
                // Extract comprehensive series details using SeriesDetailsExtractor
                const seriesDetails = await this.seriesDetailsExtractor.extractSeriesDetails(seriesUrl);
                // Cache the detailed series information
                await this.cacheService.cacheSeriesDetails(seriesId, seriesDetails);
                // Convert SeriesDetails to Series format for compatibility
                const series = {
                    id: seriesDetails.id,
                    title: seriesDetails.title,
                    author: seriesDetails.author,
                    synopsis: seriesDetails.synopsis,
                    coverImageUrl: seriesDetails.coverImageUrl,
                    genres: seriesDetails.genres,
                    status: seriesDetails.status,
                    rating: seriesDetails.rating,
                    totalChapters: seriesDetails.chapters.length,
                    lastUpdated: seriesDetails.lastUpdated,
                    sourceUrl: seriesDetails.sourceUrl,
                    chapters: seriesDetails.chapters
                };
                return series;
            }
        };
        const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000);
        if (!result.success) {
            throw result.error || new interfaces_1.ScrapingError('Series details extraction failed');
        }
        return result.result;
    }
    async getLatestReleases(page = 1) {
        ManhwazScraper.logger.info('Getting latest releases', { page });
        const operation = {
            operationName: 'getLatestReleases',
            url: this.urlManager.buildHomepageUrl(page),
            execute: async () => {
                return await this.latestReleasesExtractor.extractLatestReleases(page);
            }
        };
        const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000);
        if (!result.success) {
            throw result.error || new interfaces_1.ScrapingError(`Latest releases extraction failed for page ${page}`);
        }
        // Map LatestRelease[] to SeriesSearchResult[]
        const mapped = result.result.map(release => ({
            id: release.id,
            title: release.seriesTitle,
            author: 'Unknown',
            coverImageUrl: release.coverImageUrl,
            synopsis: '',
            genres: [],
            status: 'ongoing',
            rating: 0,
            sourceUrl: release.seriesUrl,
            lastUpdated: release.publishDate,
            latestChapter: release.chapterNumber
        }));
        if (mapped.length > 0) {
            ManhwazScraper.logger.info('SAMPLE LATEST RELEASE (getLatestReleases):', {
                title: mapped[0].title,
                date: mapped[0].lastUpdated,
                chapter: mapped[0].latestChapter
            });
        }
        console.log(`[ManhwazScraper] Returning ${mapped.length} mapped releases for page ${page}`);
        return mapped;
    }
    async getTrendingContent() {
        ManhwazScraper.logger.info('Getting trending content from manhwaz.com');
        return await this.retryHandler.executeWithRetry(async () => {
            // Check cache for hot scans and latest releases
            const [cachedHotScans, cachedLatestReleases] = await Promise.all([
                this.cacheService.getCachedHotScans(),
                this.cacheService.getCachedLatestReleases()
            ]);
            let hotScans;
            let latestReleases;
            // Use cached data if available, otherwise fetch
            if (cachedHotScans && cachedLatestReleases) {
                ManhwazScraper.logger.debug('Using cached trending content');
                hotScans = cachedHotScans;
                latestReleases = cachedLatestReleases;
            }
            else {
                // Get hot scans and latest releases concurrently with performance optimization
                // NOTE: Priority config not supported in base axios without plugin, keeping simple
                // const requests = [
                //   { url: this.urlManager.buildHomepageUrl(), config: { priority: 1 } },
                //   { url: this.urlManager.buildHomepageUrl(), config: { priority: 1 } }
                // ]
                const [hotScansResult, latestReleasesResult] = await Promise.all([
                    cachedHotScans || this.hotScansExtractor.extractHotScans(),
                    cachedLatestReleases || this.latestReleasesExtractor.extractLatestReleases()
                ]);
                hotScans = hotScansResult;
                latestReleases = latestReleasesResult;
                // Cache the results
                if (!cachedHotScans) {
                    await this.cacheService.cacheHotScans(hotScans);
                }
                if (!cachedLatestReleases) {
                    await this.cacheService.cacheLatestReleases(latestReleases);
                }
            }
            // Convert HotScan[] to SeriesSearchResult[] for TrendingContent interface
            const hotSeries = hotScans.map(hotScan => ({
                id: hotScan.id,
                title: hotScan.seriesTitle,
                author: 'Unknown', // Will be extracted in series details task
                coverImageUrl: hotScan.coverImageUrl,
                synopsis: '', // Will be extracted in series details task
                genres: hotScan.genres,
                status: hotScan.status,
                rating: hotScan.rating,
                sourceUrl: hotScan.seriesUrl
            }));
            // Convert LatestRelease[] to SeriesSearchResult[] for TrendingContent interface
            const latestSeries = latestReleases.map(release => ({
                id: release.id,
                title: release.seriesTitle,
                author: 'Unknown', // Will be extracted in series details task
                coverImageUrl: release.coverImageUrl,
                synopsis: '', // Will be extracted in series details task
                genres: [], // Will be extracted in series details task
                status: 'ongoing', // Assume ongoing for latest releases
                rating: 0, // Will be extracted in series details task
                sourceUrl: release.seriesUrl,
                lastUpdated: release.publishDate,
                latestChapter: release.chapterNumber
            }));
            const mostViewed = [...hotSeries].sort((a, b) => {
                const aHotScan = hotScans.find(h => h.id === a.id);
                const bHotScan = hotScans.find(h => h.id === b.id);
                return (bHotScan?.viewCount || 0) - (aHotScan?.viewCount || 0);
            });
            if (latestSeries.length > 0) {
                ManhwazScraper.logger.info('SAMPLE LATEST RELEASE:', {
                    title: latestSeries[0].title,
                    date: latestSeries[0].lastUpdated,
                    chapter: latestSeries[0].latestChapter,
                    rawDate: latestReleases[0].publishDate,
                    rawChapter: latestReleases[0].chapterNumber
                });
            }
            return {
                hotSeries,
                latestReleases: latestSeries,
                mostViewed
            };
        }, 'trending content');
    }
    async getChapterPages(chapterId) {
        if (!chapterId.trim()) {
            throw new interfaces_1.ValidationError('Chapter ID cannot be empty');
        }
        // Check cache first
        const cached = await this.cacheService.getCachedChapterPages(chapterId);
        if (cached) {
            ManhwazScraper.logger.debug('Returning cached chapter pages', {
                chapterId,
                pageCount: cached.length
            });
            return cached;
        }
        const chapterUrl = this.urlManager.buildChapterUrl(chapterId);
        ManhwazScraper.logger.info('Getting chapter pages', { chapterId, url: chapterUrl });
        return await this.retryHandler.executeWithRetry(async () => {
            const pages = await this.chapterExtractor.extractChapterPages(chapterUrl);
            // Cache the chapter pages
            await this.cacheService.cacheChapterPages(chapterId, pages);
            return pages;
        }, `chapter pages: ${chapterId}`);
    }
    async validateSource(sourceUrl) {
        if (!this.urlManager.validateUrl(sourceUrl)) {
            return false;
        }
        try {
            return await this.retryHandler.executeWithRetry(async () => {
                const response = await this.axiosInstance.head(sourceUrl);
                return response.status === 200;
            }, `validate source: ${sourceUrl}`);
        }
        catch (error) {
            ManhwazScraper.logger.warn('Source validation failed', {
                url: sourceUrl,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    // Helper method for making HTTP requests with Cheerio parsing
    async makeHttpRequest(url) {
        const response = await this.axiosInstance.get(url);
        return cheerio.load(response.data);
    }
    // Get rate limiting statistics
    getRateLimitStats() {
        return {
            requestsPerSecond: this.rateLimitConfig.requestsPerSecond,
            burstLimit: this.rateLimitConfig.burstLimit,
            retryAttempts: this.rateLimitConfig.maxAttempts
        };
    }
    // Get individual component instances for testing
    getURLManager() {
        return this.urlManager;
    }
    getRateLimiter() {
        return this.rateLimiter;
    }
    getRetryHandler() {
        return this.retryHandler;
    }
    getContentValidator() {
        return this.contentValidator;
    }
    getLatestReleasesExtractor() {
        return this.latestReleasesExtractor;
    }
    getHotScansExtractor() {
        return this.hotScansExtractor;
    }
    getSearchInterface() {
        return this.searchInterface;
    }
    getSeriesDetailsExtractor() {
        return this.seriesDetailsExtractor;
    }
    getChapterExtractor() {
        return this.chapterExtractor;
    }
    getCacheService() {
        return this.cacheService;
    }
    getPerformanceOptimizer() {
        return this.performanceOptimizer;
    }
    /**
     * Get comprehensive performance and cache statistics
     */
    getPerformanceStats() {
        return {
            rateLimiting: this.getRateLimitStats(),
            cache: this.cacheService.getCacheStats(),
            performance: this.performanceOptimizer.getMetrics(),
            queue: this.performanceOptimizer.getQueueStats()
        };
    }
    /**
     * Invalidate cache for specific content types
     */
    async invalidateCache(type) {
        await this.cacheService.invalidateCache(type);
        ManhwazScraper.logger.info('Cache invalidated', { type });
    }
    /**
     * Warm cache with priority content
     */
    async warmCache(urls = []) {
        await this.cacheService.warmCache(urls);
        ManhwazScraper.logger.info('Cache warming completed', { urlCount: urls.length });
    }
    async cleanup() {
        ManhwazScraper.logger.info('Cleaning up ManhwazScraper');
        // Cleanup cache service and performance optimizer
        await Promise.all([
            this.cacheService.cleanup(),
            this.performanceOptimizer.cleanup(),
        ]);
    }
}
exports.ManhwazScraper = ManhwazScraper;
//# sourceMappingURL=ManhwazScraper.js.map