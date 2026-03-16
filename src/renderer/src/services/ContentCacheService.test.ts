/**
 * Tests for ContentCacheService
 */

import { ContentCacheService } from './scraper/ContentCacheService'
import { LatestRelease, HotScan, SeriesDetails } from '../types'
import { SearchResponse } from './scraper/SearchInterface'
import { promises as fs } from 'fs'
import * as path from 'path'

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, 'test-cache'))
  }
}))

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}))

describe('ContentCacheService', () => {
  let cacheService: ContentCacheService
  const testCacheDir = path.join(__dirname, 'test-cache')

  beforeEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rmdir(testCacheDir, { recursive: true })
    } catch {
      // Directory doesn't exist, ignore
    }

    cacheService = new ContentCacheService({
      maxMemorySize: 10, // 10MB for testing
      maxDiskSize: 50, // 50MB for testing
      defaultTTL: 1000, // 1 second for testing
      enableDiskCache: true
    })

    await cacheService.initialize()
  })

  afterEach(async () => {
    await cacheService.cleanup()

    // Clean up test cache directory
    try {
      await fs.rmdir(testCacheDir, { recursive: true })
    } catch {
      // Directory doesn't exist, ignore
    }
  })

  describe('Latest Releases Caching', () => {
    it('should cache and retrieve latest releases', async () => {
      const mockReleases: LatestRelease[] = [
        {
          id: 'release-1',
          seriesTitle: 'Test Series 1',
          chapterNumber: '1',
          chapterTitle: 'Chapter 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/1',
          chapterUrl: 'https://manhwaz.com/chapter/1',
          isNew: true
        },
        {
          id: 'release-2',
          seriesTitle: 'Test Series 2',
          chapterNumber: '5',
          coverImageUrl: 'https://example.com/cover2.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/2',
          chapterUrl: 'https://manhwaz.com/chapter/5',
          isNew: false
        }
      ]

      // Cache the releases
      await cacheService.cacheLatestReleases(mockReleases)

      // Retrieve from cache
      const cached = await cacheService.getCachedLatestReleases()

      expect(cached).toEqual(mockReleases)
    })

    it('should return null for expired cache', async () => {
      const mockReleases: LatestRelease[] = [
        {
          id: 'release-1',
          seriesTitle: 'Test Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/1',
          chapterUrl: 'https://manhwaz.com/chapter/1',
          isNew: true
        }
      ]

      // Cache with very short TTL
      const shortTTLService = new ContentCacheService({
        homepageCacheTTL: 10 // 10ms
      })
      await shortTTLService.initialize()

      await shortTTLService.cacheLatestReleases(mockReleases)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20))

      const cached = await shortTTLService.getCachedLatestReleases()
      expect(cached).toBeNull()

      await shortTTLService.cleanup()
    })
  })

  describe('Hot Scans Caching', () => {
    it('should cache and retrieve hot scans', async () => {
      const mockHotScans: HotScan[] = [
        {
          id: 'hot-1',
          seriesTitle: 'Hot Series 1',
          coverImageUrl: 'https://example.com/hot1.jpg',
          rating: 4.5,
          viewCount: 10000,
          rank: 1,
          genres: ['Action', 'Adventure'],
          status: 'ongoing',
          seriesUrl: 'https://manhwaz.com/series/hot1',
          lastChapter: 'Chapter 10'
        }
      ]

      await cacheService.cacheHotScans(mockHotScans)
      const cached = await cacheService.getCachedHotScans()

      expect(cached).toEqual(mockHotScans)
    })
  })

  describe('Search Results Caching', () => {
    it('should cache and retrieve search results', async () => {
      const mockSearchResponse: SearchResponse = {
        query: 'test query',
        results: [
          {
            id: 'search-1',
            title: 'Search Result 1',
            author: 'Author 1',
            coverImageUrl: 'https://example.com/search1.jpg',
            synopsis: 'Test synopsis',
            genres: ['Action'],
            status: 'ongoing',
            rating: 4.0,
            sourceUrl: 'https://manhwaz.com/series/search1'
          }
        ],
        totalCount: 1,
        hasMore: false,
        suggestions: []
      }

      await cacheService.cacheSearchResults('test query', mockSearchResponse)
      const cached = await cacheService.getCachedSearchResults('test query')

      expect(cached).toEqual(mockSearchResponse)
    })

    it('should normalize search queries for consistent caching', async () => {
      const mockSearchResponse: SearchResponse = {
        query: 'normalized query',
        results: [],
        totalCount: 0,
        hasMore: false,
        suggestions: []
      }

      // Cache with different formatting
      await cacheService.cacheSearchResults('  NORMALIZED   QUERY  ', mockSearchResponse)

      // Should retrieve with normalized query
      const cached = await cacheService.getCachedSearchResults('normalized query')
      expect(cached).toEqual(mockSearchResponse)
    })
  })

  describe('Series Details Caching', () => {
    it('should cache and retrieve series details', async () => {
      const mockSeriesDetails: SeriesDetails = {
        id: 'series-1',
        title: 'Test Series',
        alternativeTitles: ['Alt Title'],
        author: 'Test Author',
        artist: 'Test Artist',
        synopsis: 'Test synopsis',
        coverImageUrl: 'https://example.com/series1.jpg',
        genres: ['Action', 'Adventure'],
        status: 'ongoing',
        rating: 4.5,
        viewCount: 50000,
        chapters: [
          {
            id: 'chapter-1',
            chapterNumber: '1',
            title: 'Chapter 1',
            publishDate: new Date(),
            chapterUrl: 'https://manhwaz.com/chapter/1'
          }
        ],
        lastUpdated: new Date(),
        sourceUrl: 'https://manhwaz.com/series/1'
      }

      await cacheService.cacheSeriesDetails('series-1', mockSeriesDetails)
      const cached = await cacheService.getCachedSeriesDetails('series-1')

      expect(cached).toEqual(mockSeriesDetails)
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache by tag', async () => {
      const mockReleases: LatestRelease[] = [
        {
          id: 'release-1',
          seriesTitle: 'Test Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/1',
          chapterUrl: 'https://manhwaz.com/chapter/1',
          isNew: true
        }
      ]

      await cacheService.cacheLatestReleases(mockReleases)

      // Verify cache exists
      let cached = await cacheService.getCachedLatestReleases()
      expect(cached).toEqual(mockReleases)

      // Invalidate homepage cache
      await cacheService.invalidateCache('homepage')

      // Verify cache is cleared
      cached = await cacheService.getCachedLatestReleases()
      expect(cached).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const mockReleases: LatestRelease[] = [
        {
          id: 'release-1',
          seriesTitle: 'Test Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/1',
          chapterUrl: 'https://manhwaz.com/chapter/1',
          isNew: true
        }
      ]

      await cacheService.cacheLatestReleases(mockReleases)

      const stats = cacheService.getCacheStats()

      expect(stats.memoryUsage.entries).toBeGreaterThan(0)
      expect(stats.memoryUsage.sizeBytes).toBeGreaterThan(0)
      expect(stats.memoryUsage.maxSizeBytes).toBe(10 * 1024 * 1024) // 10MB
    })
  })

  describe('Expired Cache Cleanup', () => {
    it('should clear expired cache entries', async () => {
      const mockReleases: LatestRelease[] = [
        {
          id: 'release-1',
          seriesTitle: 'Test Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/series/1',
          chapterUrl: 'https://manhwaz.com/chapter/1',
          isNew: true
        }
      ]

      // Cache with very short TTL
      const shortTTLService = new ContentCacheService({
        homepageCacheTTL: 10 // 10ms
      })
      await shortTTLService.initialize()

      await shortTTLService.cacheLatestReleases(mockReleases)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20))

      // Clear expired entries
      await shortTTLService.clearExpiredCache()

      const cached = await shortTTLService.getCachedLatestReleases()
      expect(cached).toBeNull()

      await shortTTLService.cleanup()
    })
  })
})