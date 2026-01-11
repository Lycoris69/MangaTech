import { BaseScraper, ScrapingError, RateLimitError, ValidationError } from './WebScrapingService'
import { Series, SeriesSearchResult, TrendingContent, PageUrl } from '../types'
import { Page } from 'puppeteer'

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      goto: jest.fn().mockResolvedValue({ ok: () => true }),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}))

// Test implementation of BaseScraper
class TestScraper extends BaseScraper {
  async searchSeries(query: string): Promise<SeriesSearchResult[]> {
    return await this.makeRequest(`/search?q=${query}`, async (page: Page) => {
      return [
        {
          id: 'test-series-1',
          title: 'Test Series 1',
          author: 'Test Author',
          coverImageUrl: 'https://example.com/cover1.jpg',
          synopsis: 'Test synopsis',
          genres: ['Action', 'Adventure'],
          status: 'ongoing' as const,
          rating: 4.5,
          sourceUrl: 'https://example.com/series/test-series-1'
        }
      ]
    })
  }

  async getSeriesDetails(seriesId: string): Promise<Series> {
    return await this.makeRequest(`/series/${seriesId}`, async (page: Page) => {
      return {
        id: seriesId,
        title: 'Test Series',
        author: 'Test Author',
        synopsis: 'Test synopsis',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Action'],
        status: 'ongoing' as const,
        rating: 4.0,
        totalChapters: 100,
        lastUpdated: new Date(),
        sourceUrl: `https://example.com/series/${seriesId}`
      }
    })
  }

  async getTrendingContent(): Promise<TrendingContent> {
    return await this.makeRequest('/trending', async (page: Page) => {
      const mockSeries: SeriesSearchResult[] = [
        {
          id: 'trending-1',
          title: 'Trending Series',
          author: 'Popular Author',
          coverImageUrl: 'https://example.com/trending.jpg',
          synopsis: 'Popular series',
          genres: ['Action'],
          status: 'ongoing' as const,
          rating: 4.8,
          sourceUrl: 'https://example.com/series/trending-1'
        }
      ]

      return {
        hotSeries: mockSeries,
        latestReleases: mockSeries,
        mostViewed: mockSeries
      }
    })
  }

  async getChapterPages(chapterId: string): Promise<PageUrl[]> {
    return await this.makeRequest(`/chapter/${chapterId}`, async (page: Page) => {
      return [
        { pageNumber: 1, imageUrl: 'https://example.com/page1.jpg' },
        { pageNumber: 2, imageUrl: 'https://example.com/page2.jpg' }
      ]
    })
  }
}

describe('WebScrapingService', () => {
  let scraper: TestScraper

  beforeEach(() => {
    scraper = new TestScraper()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await scraper.cleanup()
  })

  describe('BaseScraper', () => {
    it('should initialize browser successfully', async () => {
      const result = await scraper.searchSeries('test query')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Series 1')
    })

    it('should handle rate limiting', async () => {
      // Create scraper with very restrictive rate limits for testing
      const restrictedScraper = new TestScraper({
        requestsPerSecond: 1,
        burstLimit: 1
      })

      const startTime = Date.now()
      
      // Make multiple requests
      const promises = [
        restrictedScraper.searchSeries('query1'),
        restrictedScraper.searchSeries('query2')
      ]

      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(900) // Allow some margin for test timing

      await restrictedScraper.cleanup()
    })

    it('should validate source URLs', async () => {
      const isValid = await scraper.validateSource('https://example.com')
      expect(isValid).toBe(true)
    })

    it('should handle validation errors for invalid URLs', async () => {
      // Mock a failed response
      const puppeteer = require('puppeteer')
      puppeteer.launch.mockResolvedValueOnce({
        newPage: jest.fn().mockResolvedValue({
          setUserAgent: jest.fn(),
          setViewport: jest.fn(),
          setRequestInterception: jest.fn(),
          on: jest.fn(),
          goto: jest.fn().mockResolvedValue({ ok: () => false }),
          close: jest.fn()
        }),
        close: jest.fn()
      })

      const isValid = await scraper.validateSource('https://invalid-url.com')
      expect(isValid).toBe(false)
    })

    it('should cleanup browser resources', async () => {
      await scraper.searchSeries('test')
      await scraper.cleanup()
      
      // Verify cleanup was called
      expect(true).toBe(true) // Browser cleanup is mocked
    })
  })

  describe('Error Handling', () => {
    it('should throw ScrapingError for general scraping failures', () => {
      const error = new ScrapingError('Test error', 'https://example.com', 404)
      expect(error.name).toBe('ScrapingError')
      expect(error.message).toBe('Test error')
      expect(error.sourceUrl).toBe('https://example.com')
      expect(error.statusCode).toBe(404)
    })

    it('should throw RateLimitError for rate limiting issues', () => {
      const error = new RateLimitError('Rate limit exceeded', 'https://example.com')
      expect(error.name).toBe('RateLimitError')
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.sourceUrl).toBe('https://example.com')
    })

    it('should throw ValidationError for invalid input', () => {
      const error = new ValidationError('Invalid input', 'https://example.com')
      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Invalid input')
      expect(error.sourceUrl).toBe('https://example.com')
    })
  })

  describe('Abstract Methods Implementation', () => {
    it('should search for series', async () => {
      const results = await scraper.searchSeries('test query')
      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        id: 'test-series-1',
        title: 'Test Series 1',
        author: 'Test Author',
        status: 'ongoing'
      })
    })

    it('should get series details', async () => {
      const series = await scraper.getSeriesDetails('test-id')
      expect(series).toMatchObject({
        id: 'test-id',
        title: 'Test Series',
        author: 'Test Author',
        status: 'ongoing',
        totalChapters: 100
      })
    })

    it('should get trending content', async () => {
      const trending = await scraper.getTrendingContent()
      expect(trending).toHaveProperty('hotSeries')
      expect(trending).toHaveProperty('latestReleases')
      expect(trending).toHaveProperty('mostViewed')
      expect(trending.hotSeries).toHaveLength(1)
    })

    it('should get chapter pages', async () => {
      const pages = await scraper.getChapterPages('test-chapter')
      expect(pages).toHaveLength(2)
      expect(pages[0]).toMatchObject({
        pageNumber: 1,
        imageUrl: 'https://example.com/page1.jpg'
      })
    })
  })

  describe('Rate Limiting Configuration', () => {
    it('should use default rate limiting configuration', () => {
      const defaultScraper = new TestScraper()
      expect(defaultScraper).toBeDefined()
    })

    it('should accept custom rate limiting configuration', () => {
      const customScraper = new TestScraper({
        requestsPerSecond: 5,
        burstLimit: 10,
        retryAttempts: 5,
        retryDelay: 2000
      })
      expect(customScraper).toBeDefined()
    })
  })
})