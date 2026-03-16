import path from 'path'
import { BaseScraper, ScrapingError, ValidationError, RateLimitConfig as BaseRateLimitConfig } from './WebScrapingService.js'
import { Series, SeriesSearchResult, TrendingContent, PageData, LatestRelease, HotScan } from '../types/index.js'
import * as cheerio from 'cheerio'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'
import { URLManager } from './URLManager.js'
import { RateLimiter, RateLimitConfig as TokenBucketConfig } from './RateLimiter.js'
import { RetryHandler, RetryConfig } from './RetryHandler.js'
import { ContentValidator } from './ContentValidator.js'
import { LatestReleasesExtractor } from './LatestReleasesExtractor.js'
import { HotScansExtractor } from './HotScansExtractor.js'
import { SearchInterface, SearchOptions, SearchResponse } from './SearchInterface.js'
import { SeriesDetailsExtractor } from './SeriesDetailsExtractor.js'
import { ChapterExtractor } from './ChapterExtractor.js'
import { ScrapingMonitor, MonitoredOperation } from './ScrapingMonitor.js'
import { scrapingMonitor } from './ScrapingMonitor.js'
import { ContentCacheService } from './ContentCacheService.js'
import { PerformanceOptimizer } from './PerformanceOptimizer.js'

// Rate limiting configuration specific to manhwaz.com
interface ManhwazRateLimitConfig extends BaseRateLimitConfig, RetryConfig, TokenBucketConfig {
  requestsPerSecond: number
  burstLimit: number
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
export class ManhwazScraper extends BaseScraper {
  protected static logger: winston.Logger
  protected rateLimitConfig: ManhwazRateLimitConfig
  private rateLimiter: RateLimiter
  private retryHandler: RetryHandler
  private urlManager: URLManager
  private contentValidator: ContentValidator
  private axiosInstance: AxiosInstance
  private latestReleasesExtractor: LatestReleasesExtractor
  private hotScansExtractor: HotScansExtractor
  private searchInterface: SearchInterface
  private seriesDetailsExtractor: SeriesDetailsExtractor
  private chapterExtractor: ChapterExtractor
  private scrapingMonitor: ScrapingMonitor
  private cacheService: ContentCacheService
  private performanceOptimizer: PerformanceOptimizer

  constructor(logDirectory: string = 'logs') {
    // Configure rate limiting for manhwaz.com (Requirements 5.1, 5.4)
    const rateLimitConfig: ManhwazRateLimitConfig = {
      requestsPerSecond: 1, // Conservative rate to respect server resources
      burstLimit: 3,
      maxAttempts: 3,
      baseDelay: 2000, // 2 second base delay
      backoffMultiplier: 2,
      maxDelay: 30000, // 30 second max delay
      jitterEnabled: true,
      retryAttempts: 3,
      retryDelay: 2000
    }

    super({
      requestsPerSecond: rateLimitConfig.requestsPerSecond,
      burstLimit: rateLimitConfig.burstLimit,
      retryAttempts: rateLimitConfig.maxAttempts,
      retryDelay: rateLimitConfig.baseDelay
    })

    this.rateLimitConfig = rateLimitConfig
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: rateLimitConfig.requestsPerSecond,
      burstLimit: rateLimitConfig.burstLimit,
      maxWaitTime: rateLimitConfig.maxDelay
    })
    this.retryHandler = new RetryHandler({
      maxAttempts: rateLimitConfig.maxAttempts,
      baseDelay: rateLimitConfig.baseDelay,
      backoffMultiplier: rateLimitConfig.backoffMultiplier,
      maxDelay: rateLimitConfig.maxDelay,
      jitterEnabled: rateLimitConfig.jitterEnabled
    })
    this.urlManager = new URLManager()
    this.contentValidator = new ContentValidator()
    this.latestReleasesExtractor = new LatestReleasesExtractor(
      this.urlManager,
      this.rateLimiter,
      this.contentValidator
    )
    this.hotScansExtractor = new HotScansExtractor(
      this.urlManager,
      this.rateLimiter,
      this.contentValidator
    )
    this.searchInterface = new SearchInterface(
      this.urlManager,
      this.rateLimiter,
      this.contentValidator
    )
    this.seriesDetailsExtractor = new SeriesDetailsExtractor(
      this.urlManager,
      this.rateLimiter,
      this.contentValidator
    )
    this.chapterExtractor = new ChapterExtractor(
      this.urlManager,
      this.rateLimiter,
      this.contentValidator
    )

    // Initialize monitoring system
    this.scrapingMonitor = scrapingMonitor

    // Initialize caching and performance optimization
    this.cacheService = new ContentCacheService()
    this.performanceOptimizer = new PerformanceOptimizer(this.rateLimiter)

    // Initialize logger
    if (!ManhwazScraper.logger) {
      ManhwazScraper.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'manhwaz-scraper' },
        transports: [
          new winston.transports.Console({
            format: winston.format.simple()
          }),
          new winston.transports.File({
            filename: path.join(logDirectory, 'combined.log')
          })
        ]
      })
    }

    // Configure axios instance with rate limiting
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquireToken()
      ManhwazScraper.logger.debug('Making HTTP request', { url: config.url })
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        ManhwazScraper.logger.error('HTTP request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        })
        return Promise.reject(error)
      }
    )

    // Initialize services
    this.initialize()
  }

  /**
   * Initialize the scraper and its services
   */
  private async initialize(): Promise<void> {
    try {
      await this.cacheService.initialize()
      ManhwazScraper.logger.info('ManhwazScraper initialized successfully')
    } catch (error) {
      ManhwazScraper.logger.error('Failed to initialize ManhwazScraper', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async searchSeries(query: string, options?: SearchOptions): Promise<SeriesSearchResult[]> {
    if (!query.trim()) {
      throw new ValidationError('Search query cannot be empty')
    }

    ManhwazScraper.logger.info('Searching series', { query, options })

    const operation: MonitoredOperation<SeriesSearchResult[]> = {
      operationName: 'searchSeries',
      url: this.urlManager.buildSearchUrl(query),
      execute: async () => {
        const searchResponse = await this.searchInterface.searchSeries(query, options)
        return searchResponse.results
      }
    }

    const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000)

    if (!result.success) {
      throw result.error || new ScrapingError('Search operation failed')
    }

    return result.result!
  }

  async searchSeriesWithDetails(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!query.trim()) {
      throw new ValidationError('Search query cannot be empty')
    }

    ManhwazScraper.logger.info('Searching series with details', { query, options })

    // Check cache first
    const cached = await this.cacheService.getCachedSearchResults(query)
    if (cached) {
      ManhwazScraper.logger.debug('Returning cached search results', {
        query,
        resultCount: cached.results.length
      })
      return cached
    }

    return await this.retryHandler.executeWithRetry(async () => {
      const searchResponse = await this.searchInterface.searchSeries(query, options)

      // Cache the results
      await this.cacheService.cacheSearchResults(query, searchResponse)

      return searchResponse
    }, `search with details: ${query}`)
  }

  async getAutocompleteSuggestions(partialQuery: string): Promise<import('./SearchInterface.js').AutocompleteResult[]> {
    if (!partialQuery.trim()) {
      return []
    }

    ManhwazScraper.logger.info('Getting autocomplete suggestions', { query: partialQuery })

    return await this.retryHandler.executeWithRetry(async () => {
      return await this.searchInterface.getAutocompleteSuggestions(partialQuery)
    }, `autocomplete: ${partialQuery}`)
  }

  async getSeriesDetails(seriesId: string): Promise<Series> {
    if (!seriesId.trim()) {
      throw new ValidationError('Series ID cannot be empty')
    }

    // Check cache first
    const cached = await this.cacheService.getCachedSeriesDetails(seriesId)
    if (cached) {
      ManhwazScraper.logger.debug('Returning cached series details', {
        seriesId,
        title: cached.title
      })

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
      }
    }

    const seriesUrl = this.urlManager.buildSeriesUrl(seriesId)
    ManhwazScraper.logger.info('Getting series details', { seriesId, url: seriesUrl })

    const operation: MonitoredOperation<Series> = {
      operationName: 'getSeriesDetails',
      url: seriesUrl,
      execute: async () => {
        // Extract comprehensive series details using SeriesDetailsExtractor
        const seriesDetails = await this.seriesDetailsExtractor.extractSeriesDetails(seriesUrl)

        // Cache the detailed series information
        await this.cacheService.cacheSeriesDetails(seriesId, seriesDetails)

        // Convert SeriesDetails to Series format for compatibility
        const series: Series = {
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
        }

        return series
      }
    }

    const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000)

    if (!result.success) {
      throw result.error || new ScrapingError('Series details extraction failed')
    }

    return result.result!
  }

  async getLatestReleases(page: number = 1): Promise<SeriesSearchResult[]> {
    ManhwazScraper.logger.info('Getting latest releases', { page })

    const operation: MonitoredOperation<LatestRelease[]> = {
      operationName: 'getLatestReleases',
      url: this.urlManager.buildHomepageUrl(page),
      execute: async () => {
        return await this.latestReleasesExtractor.extractLatestReleases(page)
      }
    }

    const result = await this.scrapingMonitor.executeWithRetry(operation, 3, 2000)

    if (!result.success) {
      throw result.error || new ScrapingError(`Latest releases extraction failed for page ${page}`)
    }

    // Map LatestRelease[] to SeriesSearchResult[]
    const mapped = result.result!.map(release => ({
      id: release.id,
      title: release.seriesTitle,
      author: 'Unknown',
      coverImageUrl: release.coverImageUrl,
      synopsis: '',
      genres: [],
      status: 'ongoing' as const,
      rating: 0,
      sourceUrl: release.seriesUrl,
      lastUpdated: release.publishDate,
      latestChapter: release.chapterNumber
    }))

    if (mapped.length > 0) {
      ManhwazScraper.logger.info('SAMPLE LATEST RELEASE (getLatestReleases):', {
        title: mapped[0].title,
        date: mapped[0].lastUpdated,
        chapter: mapped[0].latestChapter
      })
    }

    console.log(`[ManhwazScraper] Returning ${mapped.length} mapped releases for page ${page}`);
    return mapped
  }

  async getTrendingContent(): Promise<TrendingContent> {
    ManhwazScraper.logger.info('Getting trending content from manhwaz.com')

    return await this.retryHandler.executeWithRetry(async () => {
      // Check cache for hot scans and latest releases
      const [cachedHotScans, cachedLatestReleases] = await Promise.all([
        this.cacheService.getCachedHotScans(),
        this.cacheService.getCachedLatestReleases()
      ])

      let hotScans: HotScan[]
      let latestReleases: LatestRelease[]

      // Use cached data if available, otherwise fetch
      if (cachedHotScans && cachedLatestReleases) {
        ManhwazScraper.logger.debug('Using cached trending content')
        hotScans = cachedHotScans
        latestReleases = cachedLatestReleases
      } else {
        // Get hot scans and latest releases concurrently with performance optimization

        const [hotScansResult, latestReleasesResult] = await Promise.all([
          cachedHotScans || this.hotScansExtractor.extractHotScans(),
          cachedLatestReleases || this.latestReleasesExtractor.extractLatestReleases()
        ])

        hotScans = hotScansResult
        latestReleases = latestReleasesResult

        // Cache the results
        if (!cachedHotScans) {
          await this.cacheService.cacheHotScans(hotScans)
        }
        if (!cachedLatestReleases) {
          await this.cacheService.cacheLatestReleases(latestReleases)
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
      }))

      // Convert LatestRelease[] to SeriesSearchResult[] for TrendingContent interface
      const latestSeries = latestReleases.map(release => ({
        id: release.id,
        title: release.seriesTitle,
        author: 'Unknown', // Will be extracted in series details task
        coverImageUrl: release.coverImageUrl,
        synopsis: '', // Will be extracted in series details task
        genres: [], // Will be extracted in series details task
        status: 'ongoing' as const, // Assume ongoing for latest releases
        rating: 0, // Will be extracted in series details task
        sourceUrl: release.seriesUrl,
        lastUpdated: release.publishDate,
        latestChapter: release.chapterNumber
      }))

      const mostViewed = [...hotSeries].sort((a, b) => {
        const aHotScan = hotScans.find(h => h.id === a.id)
        const bHotScan = hotScans.find(h => h.id === b.id)
        return (bHotScan?.viewCount || 0) - (aHotScan?.viewCount || 0)
      })

      if (latestSeries.length > 0) {
        ManhwazScraper.logger.info('SAMPLE LATEST RELEASE:', {
          title: latestSeries[0].title,
          date: latestSeries[0].lastUpdated,
          chapter: latestSeries[0].latestChapter,
          rawDate: latestReleases[0].publishDate,
          rawChapter: latestReleases[0].chapterNumber
        })
      }

      return {
        hotSeries,
        latestReleases: latestSeries,
        mostViewed
      }
    }, 'trending content')
  }

  async getChapterPages(chapterId: string): Promise<PageData[]> {
    if (!chapterId.trim()) {
      throw new ValidationError('Chapter ID cannot be empty')
    }

    // Check cache first
    const cached = await this.cacheService.getCachedChapterPages(chapterId)
    if (cached) {
      ManhwazScraper.logger.debug('Returning cached chapter pages', {
        chapterId,
        pageCount: cached.length
      })
      return cached
    }

    const chapterUrl = this.urlManager.buildChapterUrl(chapterId)
    ManhwazScraper.logger.info('Getting chapter pages', { chapterId, url: chapterUrl })

    return await this.retryHandler.executeWithRetry(async () => {
      const pages = await this.chapterExtractor.extractChapterPages(chapterUrl)

      // Cache the chapter pages
      await this.cacheService.cacheChapterPages(chapterId, pages)

      return pages
    }, `chapter pages: ${chapterId}`)
  }

  async validateSource(sourceUrl: string): Promise<boolean> {
    if (!this.urlManager.validateUrl(sourceUrl)) {
      return false
    }

    try {
      return await this.retryHandler.executeWithRetry(async () => {
        const response = await this.axiosInstance.head(sourceUrl)
        return response.status === 200
      }, `validate source: ${sourceUrl}`)
    } catch (error) {
      ManhwazScraper.logger.warn('Source validation failed', {
        url: sourceUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  // Helper method for making HTTP requests with Cheerio parsing
  protected async makeHttpRequest(url: string): Promise<cheerio.CheerioAPI> {
    const response = await this.axiosInstance.get(url)
    return cheerio.load(response.data)
  }

  // Get rate limiting statistics
  public getRateLimitStats(): {
    requestsPerSecond: number
    burstLimit: number
    retryAttempts: number
  } {
    return {
      requestsPerSecond: this.rateLimitConfig.requestsPerSecond,
      burstLimit: this.rateLimitConfig.burstLimit,
      retryAttempts: this.rateLimitConfig.maxAttempts
    }
  }

  // Get individual component instances for testing
  public getURLManager(): URLManager {
    return this.urlManager
  }

  public getRateLimiter(): RateLimiter {
    return this.rateLimiter
  }

  public getRetryHandler(): RetryHandler {
    return this.retryHandler
  }

  public getContentValidator(): ContentValidator {
    return this.contentValidator
  }

  public getLatestReleasesExtractor(): LatestReleasesExtractor {
    return this.latestReleasesExtractor
  }

  public getHotScansExtractor(): HotScansExtractor {
    return this.hotScansExtractor
  }

  public getSearchInterface(): SearchInterface {
    return this.searchInterface
  }

  public getSeriesDetailsExtractor(): SeriesDetailsExtractor {
    return this.seriesDetailsExtractor
  }

  public getChapterExtractor(): ChapterExtractor {
    return this.chapterExtractor
  }

  public getCacheService(): ContentCacheService {
    return this.cacheService
  }

  public getPerformanceOptimizer(): PerformanceOptimizer {
    return this.performanceOptimizer
  }

  /**
   * Get comprehensive performance and cache statistics
   */
  public getPerformanceStats(): {
    rateLimiting: ReturnType<ManhwazScraper['getRateLimitStats']>
    cache: ReturnType<ContentCacheService['getCacheStats']>
    performance: ReturnType<PerformanceOptimizer['getMetrics']>
    queue: ReturnType<PerformanceOptimizer['getQueueStats']>
  } {
    return {
      rateLimiting: this.getRateLimitStats(),
      cache: this.cacheService.getCacheStats(),
      performance: this.performanceOptimizer.getMetrics(),
      queue: this.performanceOptimizer.getQueueStats()
    }
  }

  /**
   * Invalidate cache for specific content types and IDs
   */
  async invalidateCache(type: 'homepage' | 'search' | 'series' | 'chapter' | string, id?: string): Promise<void> {
    if (type === 'chapter' && id) {
      const chapterUrl = this.urlManager.buildChapterUrl(id)
      this.chapterExtractor.clearCache(chapterUrl)
      await this.cacheService.invalidateCache(`chapter:${id}:pages`)
    } else if (type === 'series' && id) {
      const seriesUrl = this.urlManager.buildSeriesUrl(id)
      this.seriesDetailsExtractor.clearCache(seriesUrl)
      await this.cacheService.invalidateCache(`series:${id}`)
    } else if (type === 'search' && id) {
      await this.cacheService.invalidateCache(`search:${id}`)
    } else {
      await this.cacheService.invalidateCache(type)
      if (type === 'chapter') this.chapterExtractor.clearCache()
      if (type === 'series') this.seriesDetailsExtractor.clearCache()
    }
    ManhwazScraper.logger.info('Cache invalidated', { type, id })
  }

  /**
   * Warm cache with priority content
   */
  async warmCache(urls: string[] = []): Promise<void> {
    await this.cacheService.warmCache(urls)
    ManhwazScraper.logger.info('Cache warming completed', { urlCount: urls.length })
  }

  async cleanup(): Promise<void> {
    ManhwazScraper.logger.info('Cleaning up ManhwazScraper')

    // Cleanup cache service and performance optimizer
    await Promise.all([
      this.cacheService.cleanup(),
      this.performanceOptimizer.cleanup(),
      super.cleanup()
    ])
  }
}