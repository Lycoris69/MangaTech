import puppeteer, { Browser, Page } from 'puppeteer'
import { Series, Chapter, SeriesSearchResult, TrendingContent, PageUrl } from '../types'
import { errorService } from './ErrorService'
import { ErrorType, ErrorSeverity } from '../types/errors'

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerSecond: number
  burstLimit: number
  retryAttempts: number
  retryDelay: number
}

// Default rate limiting configuration
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 2, // Conservative rate to avoid overwhelming sources
  burstLimit: 5,
  retryAttempts: 3,
  retryDelay: 1000 // 1 second base delay
}

// Request queue item
interface QueuedRequest {
  url: string
  resolve: (value: any) => void
  reject: (error: Error) => void
  timestamp: number
  attempts: number
}

// Web scraping service interface
export interface WebScrapingService {
  searchSeries(query: string): Promise<SeriesSearchResult[]>
  getSeriesDetails(seriesId: string): Promise<Series>
  getTrendingContent(): Promise<TrendingContent>
  getLatestReleases(page?: number): Promise<any[]>
  getChapterPages(chapterId: string): Promise<PageUrl[]>
  validateSource(sourceUrl: string): Promise<boolean>
  invalidateCache(type: 'series' | 'chapter' | 'search', id?: string): Promise<void>
}

// Base scraper class with common functionality
export abstract class BaseScraper implements WebScrapingService {
  protected browser: Browser | null = null
  protected rateLimitConfig: RateLimitConfig
  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  private lastRequestTime = 0
  private requestCount = 0
  private windowStart = Date.now()

  constructor(rateLimitConfig: Partial<RateLimitConfig> = {}) {
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...rateLimitConfig }
  }

  // Initialize browser instance
  protected async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        })
      } catch (error) {
        const appError = errorService.createError(
          ErrorType.SCRAPING,
          'Failed to initialize browser for web scraping',
          {
            severity: ErrorSeverity.HIGH,
            details: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
            originalError: error instanceof Error ? error : undefined
          }
        )
        throw new Error(appError.userMessage)
      }
    }
  }

  // Create a new page with common settings
  protected async createPage(): Promise<Page> {
    await this.initializeBrowser()
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'media') {
        req.abort()
      } else {
        req.continue()
      }
    })

    return page
  }

  // Rate-limited request method
  protected async makeRequest<T>(url: string, requestHandler: (page: Page) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        url,
        resolve: async (page: Page) => {
          try {
            const result = await requestHandler(page)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        reject,
        timestamp: Date.now(),
        attempts: 0
      }

      this.requestQueue.push(queuedRequest)
      this.processQueue()
    })
  }

  // Process the request queue with rate limiting
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const now = Date.now()

      // Reset window if needed
      if (now - this.windowStart >= 1000) {
        this.windowStart = now
        this.requestCount = 0
      }

      // Check rate limits
      if (this.requestCount >= this.rateLimitConfig.requestsPerSecond) {
        const waitTime = 1000 - (now - this.windowStart)
        if (waitTime > 0) {
          await this.delay(waitTime)
          continue
        }
      }

      const request = this.requestQueue.shift()!

      try {
        // Ensure minimum delay between requests
        const timeSinceLastRequest = now - this.lastRequestTime
        const minDelay = 1000 / this.rateLimitConfig.requestsPerSecond
        if (timeSinceLastRequest < minDelay) {
          await this.delay(minDelay - timeSinceLastRequest)
        }

        const page = await this.createPage()

        try {
          await request.resolve(page)
          this.requestCount++
          this.lastRequestTime = Date.now()
        } finally {
          await page.close()
        }
      } catch (error) {
        request.attempts++

        if (request.attempts < this.rateLimitConfig.retryAttempts) {
          // Exponential backoff for retries
          const delay = this.rateLimitConfig.retryDelay * Math.pow(2, request.attempts - 1)
          await this.delay(delay)
          this.requestQueue.unshift(request) // Put back at front of queue
        } else {
          request.reject(error instanceof Error ? error : new Error('Unknown error occurred'))
        }
      }
    }

    this.isProcessingQueue = false
  }

  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Validate that a source URL is accessible
  public async validateSource(sourceUrl: string): Promise<boolean> {
    try {
      return await this.makeRequest(sourceUrl, async (page) => {
        const response = await page.goto(sourceUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        })
        return response?.ok() ?? false
      })
    } catch (error) {
      console.error(`Failed to validate source ${sourceUrl}:`, error)
      return false
    }
  }

  // Clean up resources
  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  // Abstract methods to be implemented by concrete scrapers
  abstract searchSeries(query: string): Promise<SeriesSearchResult[]>
  abstract getSeriesDetails(seriesId: string): Promise<Series>
  abstract getTrendingContent(): Promise<TrendingContent>
  abstract getLatestReleases(page?: number): Promise<any[]>
  abstract getChapterPages(chapterId: string): Promise<PageUrl[]>
  abstract invalidateCache(type: 'series' | 'chapter' | 'search', id?: string): Promise<void>
}

// Error types for web scraping
export class ScrapingError extends Error {
  constructor(
    message: string,
    public readonly sourceUrl?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'ScrapingError'
  }
}

export class RateLimitError extends ScrapingError {
  constructor(message: string, sourceUrl?: string) {
    super(message, sourceUrl)
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends ScrapingError {
  constructor(message: string, sourceUrl?: string) {
    super(message, sourceUrl)
    this.name = 'ValidationError'
  }
}