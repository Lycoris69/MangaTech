/**
 * ContentCacheService - Intelligent caching system for manhwaz scraper
 * 
 * Provides comprehensive caching with:
 * - Intelligent cache invalidation based on content freshness
 * - Image caching and optimization
 * - Cache warming strategies for frequently accessed content
 * - Memory and disk-based caching layers
 * - Performance metrics and monitoring
 * 
 * Requirements: Performance optimization for all requirements
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { app } from 'electron'
import sharp from 'sharp'
import winston from 'winston'
import { 
  LatestRelease, 
  HotScan, 
  SeriesSearchResult, 
  SeriesDetails, 
  PageData,
  ChapterInfo 
} from '../types'
import { SearchResponse } from './SearchInterface'

// Cache configuration
export interface CacheConfig {
  maxMemorySize: number // Maximum memory cache size in MB
  maxDiskSize: number // Maximum disk cache size in MB
  defaultTTL: number // Default time-to-live in milliseconds
  imageCacheTTL: number // Image cache TTL in milliseconds
  searchCacheTTL: number // Search results cache TTL
  seriesCacheTTL: number // Series details cache TTL
  homepageCacheTTL: number // Homepage content cache TTL
  enableDiskCache: boolean
  enableImageOptimization: boolean
  imageQuality: number // JPEG quality for optimized images (1-100)
  maxImageWidth: number // Maximum width for optimized images
  maxImageHeight: number // Maximum height for optimized images
}

// Cache entry metadata
interface CacheEntry<T> {
  key: string
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
  size: number // Size in bytes
  tags: string[] // Tags for bulk invalidation
}

// Cache statistics
export interface CacheStats {
  memoryUsage: {
    entries: number
    sizeBytes: number
    maxSizeBytes: number
    hitRate: number
    missRate: number
  }
  diskUsage: {
    entries: number
    sizeBytes: number
    maxSizeBytes: number
  }
  performance: {
    averageAccessTime: number
    totalHits: number
    totalMisses: number
    totalRequests: number
  }
}

// Cache warming configuration
interface CacheWarmingConfig {
  enabled: boolean
  warmupInterval: number // Interval in milliseconds
  priorityUrls: string[] // URLs to prioritize for warming
  maxConcurrentWarmups: number
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxMemorySize: 100, // 100MB
  maxDiskSize: 500, // 500MB
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  imageCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  searchCacheTTL: 10 * 60 * 1000, // 10 minutes
  seriesCacheTTL: 60 * 60 * 1000, // 1 hour
  homepageCacheTTL: 5 * 60 * 1000, // 5 minutes
  enableDiskCache: true,
  enableImageOptimization: true,
  imageQuality: 85,
  maxImageWidth: 800,
  maxImageHeight: 1200
}

const DEFAULT_WARMING_CONFIG: CacheWarmingConfig = {
  enabled: true,
  warmupInterval: 15 * 60 * 1000, // 15 minutes
  priorityUrls: [],
  maxConcurrentWarmups: 3
}

/**
 * Multi-layer caching service with intelligent invalidation
 */
export class ContentCacheService {
  private static logger: winston.Logger
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private diskCachePath: string
  private config: CacheConfig
  private warmingConfig: CacheWarmingConfig
  private stats: CacheStats
  private warmupTimer?: NodeJS.Timeout
  private isInitialized = false

  constructor(
    config: Partial<CacheConfig> = {},
    warmingConfig: Partial<CacheWarmingConfig> = {}
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.warmingConfig = { ...DEFAULT_WARMING_CONFIG, ...warmingConfig }
    this.diskCachePath = path.join(
      app?.getPath('userData') || path.join(process.cwd(), 'data'),
      'cache'
    )

    // Initialize logger
    if (!ContentCacheService.logger) {
      ContentCacheService.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'content-cache' },
        transports: [
          new winston.transports.Console({
            format: winston.format.simple()
          })
        ]
      })
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
    }
  }

  /**
   * Initialize cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Create cache directories
      if (this.config.enableDiskCache) {
        await fs.mkdir(this.diskCachePath, { recursive: true })
        await fs.mkdir(path.join(this.diskCachePath, 'images'), { recursive: true })
        await fs.mkdir(path.join(this.diskCachePath, 'data'), { recursive: true })
      }

      // Load existing disk cache metadata
      await this.loadDiskCacheMetadata()

      // Start cache warming if enabled
      if (this.warmingConfig.enabled) {
        this.startCacheWarming()
      }

      // Start periodic cleanup
      this.startPeriodicCleanup()

      this.isInitialized = true
      ContentCacheService.logger.info('ContentCacheService initialized', {
        memoryLimit: this.config.maxMemorySize,
        diskLimit: this.config.maxDiskSize,
        warmingEnabled: this.warmingConfig.enabled
      })
    } catch (error) {
      throw new Error(`Failed to initialize ContentCacheService: ${error}`)
    }
  }

  /**
   * Cache latest releases with homepage tag
   */
  async cacheLatestReleases(releases: LatestRelease[]): Promise<void> {
    const key = 'homepage:latest-releases'
    await this.set(key, releases, this.config.homepageCacheTTL, ['homepage', 'latest-releases'])
    ContentCacheService.logger.debug('Cached latest releases', { count: releases.length })
  }

  /**
   * Get cached latest releases
   */
  async getCachedLatestReleases(): Promise<LatestRelease[] | null> {
    const key = 'homepage:latest-releases'
    return await this.get<LatestRelease[]>(key)
  }

  /**
   * Cache hot scans with homepage tag
   */
  async cacheHotScans(hotScans: HotScan[]): Promise<void> {
    const key = 'homepage:hot-scans'
    await this.set(key, hotScans, this.config.homepageCacheTTL, ['homepage', 'hot-scans'])
    ContentCacheService.logger.debug('Cached hot scans', { count: hotScans.length })
  }

  /**
   * Get cached hot scans
   */
  async getCachedHotScans(): Promise<HotScan[] | null> {
    const key = 'homepage:hot-scans'
    return await this.get<HotScan[]>(key)
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, results: SearchResponse): Promise<void> {
    const key = `search:${this.normalizeSearchQuery(query)}`
    await this.set(key, results, this.config.searchCacheTTL, ['search'])
    ContentCacheService.logger.debug('Cached search results', { 
      query, 
      resultCount: results.results.length 
    })
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string): Promise<SearchResponse | null> {
    const key = `search:${this.normalizeSearchQuery(query)}`
    return await this.get<SearchResponse>(key)
  }

  /**
   * Cache series details
   */
  async cacheSeriesDetails(seriesId: string, details: SeriesDetails): Promise<void> {
    const key = `series:${seriesId}`
    await this.set(key, details, this.config.seriesCacheTTL, ['series', `series:${seriesId}`])
    ContentCacheService.logger.debug('Cached series details', { seriesId, title: details.title })
  }

  /**
   * Get cached series details
   */
  async getCachedSeriesDetails(seriesId: string): Promise<SeriesDetails | null> {
    const key = `series:${seriesId}`
    return await this.get<SeriesDetails>(key)
  }

  /**
   * Cache chapter pages
   */
  async cacheChapterPages(chapterId: string, pages: PageData[]): Promise<void> {
    const key = `chapter:${chapterId}:pages`
    await this.set(key, pages, this.config.defaultTTL, ['chapter', `chapter:${chapterId}`])
    ContentCacheService.logger.debug('Cached chapter pages', { chapterId, pageCount: pages.length })
  }

  /**
   * Get cached chapter pages
   */
  async getCachedChapterPages(chapterId: string): Promise<PageData[] | null> {
    const key = `chapter:${chapterId}:pages`
    return await this.get<PageData[]>(key)
  }

  /**
   * Cache and optimize image
   */
  async cacheImage(imageUrl: string, imageBuffer: Buffer): Promise<string> {
    const imageKey = this.generateImageKey(imageUrl)
    const imagePath = path.join(this.diskCachePath, 'images', `${imageKey}.jpg`)

    try {
      let processedBuffer = imageBuffer

      // Optimize image if enabled
      if (this.config.enableImageOptimization) {
        processedBuffer = await sharp(imageBuffer)
          .resize(this.config.maxImageWidth, this.config.maxImageHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: this.config.imageQuality })
          .toBuffer()
      }

      // Save to disk cache
      if (this.config.enableDiskCache) {
        await fs.writeFile(imagePath, processedBuffer)
      }

      // Cache metadata in memory
      const entry: CacheEntry<string> = {
        key: `image:${imageKey}`,
        data: imagePath,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.config.imageCacheTTL,
        accessCount: 1,
        lastAccessed: Date.now(),
        size: processedBuffer.length,
        tags: ['image']
      }

      this.memoryCache.set(entry.key, entry)
      this.updateMemoryStats()

      ContentCacheService.logger.debug('Cached and optimized image', {
        url: imageUrl,
        originalSize: imageBuffer.length,
        optimizedSize: processedBuffer.length,
        path: imagePath
      })

      return imagePath
    } catch (error) {
      ContentCacheService.logger.error('Failed to cache image', {
        url: imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get cached image path
   */
  async getCachedImage(imageUrl: string): Promise<string | null> {
    const imageKey = this.generateImageKey(imageUrl)
    const cacheKey = `image:${imageKey}`
    
    const entry = this.memoryCache.get(cacheKey)
    if (!entry || Date.now() > entry.expiresAt) {
      return null
    }

    // Check if file still exists
    try {
      await fs.access(entry.data)
      entry.accessCount++
      entry.lastAccessed = Date.now()
      return entry.data
    } catch {
      // File doesn't exist, remove from cache
      this.memoryCache.delete(cacheKey)
      return null
    }
  }

  /**
   * Invalidate cache by key or tags
   */
  async invalidateCache(keyOrTag: string): Promise<void> {
    const keysToDelete: string[] = []

    // Check if it's a direct key
    if (this.memoryCache.has(keyOrTag)) {
      keysToDelete.push(keyOrTag)
    } else {
      // Treat as tag and find all entries with this tag
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.includes(keyOrTag)) {
          keysToDelete.push(key)
        }
      }
    }

    // Delete from memory cache
    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
    }

    this.updateMemoryStats()
    
    ContentCacheService.logger.info('Invalidated cache entries', {
      keyOrTag,
      deletedCount: keysToDelete.length
    })
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key)
    }

    this.updateMemoryStats()

    ContentCacheService.logger.debug('Cleared expired cache entries', {
      expiredCount: expiredKeys.length
    })
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Warm cache with frequently accessed content
   */
  async warmCache(urls: string[] = []): Promise<void> {
    const urlsToWarm = urls.length > 0 ? urls : this.warmingConfig.priorityUrls
    
    if (urlsToWarm.length === 0) {
      return
    }

    ContentCacheService.logger.info('Starting cache warming', {
      urlCount: urlsToWarm.length,
      maxConcurrent: this.warmingConfig.maxConcurrentWarmups
    })

    // Process URLs in batches to respect concurrency limits
    const batches = this.chunkArray(urlsToWarm, this.warmingConfig.maxConcurrentWarmups)
    
    for (const batch of batches) {
      const warmupPromises = batch.map(url => this.warmSingleUrl(url))
      await Promise.allSettled(warmupPromises)
    }
  }

  /**
   * Generic cache get method
   */
  private async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.stats.performance.totalRequests++

    const entry = this.memoryCache.get(key)
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.stats.performance.totalMisses++
      this.updatePerformanceStats(startTime)
      return null
    }

    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.performance.totalHits++
    this.updatePerformanceStats(startTime)

    return entry.data as T
  }

  /**
   * Generic cache set method
   */
  private async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL,
    tags: string[] = []
  ): Promise<void> {
    const serializedData = JSON.stringify(data)
    const size = Buffer.byteLength(serializedData, 'utf8')

    // Check memory limits and evict if necessary
    await this.ensureMemoryCapacity(size)

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      tags
    }

    this.memoryCache.set(key, entry)

    // Save to disk cache if enabled
    if (this.config.enableDiskCache && !key.startsWith('image:')) {
      await this.saveToDiskCache(key, entry)
    }

    this.updateMemoryStats()
  }

  /**
   * Ensure memory capacity by evicting least recently used entries
   */
  private async ensureMemoryCapacity(requiredSize: number): Promise<void> {
    const maxSize = this.config.maxMemorySize * 1024 * 1024
    let currentSize = this.stats.memoryUsage.sizeBytes

    if (currentSize + requiredSize <= maxSize) {
      return
    }

    // Sort entries by last accessed time (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    // Evict entries until we have enough space
    for (const [key, entry] of entries) {
      if (currentSize + requiredSize <= maxSize) {
        break
      }

      this.memoryCache.delete(key)
      currentSize -= entry.size

      ContentCacheService.logger.debug('Evicted cache entry for memory', {
        key,
        size: entry.size,
        lastAccessed: new Date(entry.lastAccessed)
      })
    }
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryStats(): void {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }

    this.stats.memoryUsage.entries = this.memoryCache.size
    this.stats.memoryUsage.sizeBytes = totalSize

    const totalRequests = this.stats.performance.totalRequests
    if (totalRequests > 0) {
      this.stats.memoryUsage.hitRate = this.stats.performance.totalHits / totalRequests
      this.stats.memoryUsage.missRate = this.stats.performance.totalMisses / totalRequests
    }
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(startTime: number): void {
    const accessTime = Date.now() - startTime
    const totalRequests = this.stats.performance.totalRequests
    
    this.stats.performance.averageAccessTime = 
      (this.stats.performance.averageAccessTime * (totalRequests - 1) + accessTime) / totalRequests
  }

  /**
   * Generate consistent image key from URL
   */
  private generateImageKey(imageUrl: string): string {
    // Simple hash function for generating consistent keys
    let hash = 0
    for (let i = 0; i < imageUrl.length; i++) {
      const char = imageUrl.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Normalize search query for consistent caching
   */
  private normalizeSearchQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, '-')
  }

  /**
   * Load disk cache metadata on startup
   */
  private async loadDiskCacheMetadata(): Promise<void> {
    if (!this.config.enableDiskCache) {
      return
    }

    try {
      const metadataPath = path.join(this.diskCachePath, 'metadata.json')
      const data = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(data)
      
      // Restore valid entries to memory cache
      for (const entry of metadata.entries || []) {
        if (Date.now() < entry.expiresAt) {
          this.memoryCache.set(entry.key, entry)
        }
      }

      this.updateMemoryStats()
      ContentCacheService.logger.info('Loaded disk cache metadata', {
        entriesLoaded: this.memoryCache.size
      })
    } catch (error) {
      // Metadata file doesn't exist or is corrupted, start fresh
      ContentCacheService.logger.debug('No existing cache metadata found')
    }
  }

  /**
   * Save entry to disk cache
   */
  private async saveToDiskCache(key: string, entry: CacheEntry<any>): Promise<void> {
    try {
      const dataPath = path.join(this.diskCachePath, 'data', `${key.replace(/[:/]/g, '_')}.json`)
      await fs.writeFile(dataPath, JSON.stringify(entry.data))
    } catch (error) {
      ContentCacheService.logger.warn('Failed to save to disk cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Start cache warming timer
   */
  private startCacheWarming(): void {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer)
    }

    this.warmupTimer = setInterval(() => {
      this.warmCache().catch(error => {
        ContentCacheService.logger.error('Cache warming failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    }, this.warmingConfig.warmupInterval)
  }

  /**
   * Start periodic cleanup timer
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.clearExpiredCache().catch(error => {
        ContentCacheService.logger.error('Periodic cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Warm a single URL (placeholder for actual implementation)
   */
  private async warmSingleUrl(url: string): Promise<void> {
    // This would be implemented to pre-fetch and cache content from the URL
    // For now, it's a placeholder that logs the warming attempt
    ContentCacheService.logger.debug('Warming cache for URL', { url })
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer)
    }

    // Save cache metadata to disk
    if (this.config.enableDiskCache) {
      try {
        const metadataPath = path.join(this.diskCachePath, 'metadata.json')
        const metadata = {
          entries: Array.from(this.memoryCache.values()),
          timestamp: Date.now()
        }
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      } catch (error) {
        ContentCacheService.logger.error('Failed to save cache metadata', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    ContentCacheService.logger.info('ContentCacheService cleanup completed')
  }
}