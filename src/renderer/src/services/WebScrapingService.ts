import { Series, SeriesSearchResult, TrendingContent, PageUrl } from '../types'
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
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timestamp: number
  attempts: number
}

// Web scraping service interface
export interface WebScrapingService {
  searchSeries(query: string): Promise<SeriesSearchResult[]>
  getSeriesDetails(seriesId: string): Promise<Series>
  getTrendingContent(): Promise<TrendingContent>
  getChapterPages(chapterId: string): Promise<PageUrl[]>
  validateSource(sourceUrl: string): Promise<boolean>
}

// Base scraper class with common functionality
export abstract class BaseScraper implements WebScrapingService {
  protected rateLimitConfig: RateLimitConfig
  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  private lastRequestTime = 0
  private requestCount = 0
  private windowStart = Date.now()

  constructor(rateLimitConfig: Partial<RateLimitConfig> = {}) {
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...rateLimitConfig }
  }

  // Placeholder for initialization if needed
  protected async initialize(): Promise<void> {
    // To be implemented by subclasses
  }

  // Rate-limited request method (simplified for non-browser fetch)
  protected async makeRequest<T>(url: string, requestHandler: (url: string) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        url,
        resolve: (async () => {
          try {
            const result = await requestHandler(url)
            resolve(result as T)
          } catch (error) {
            reject(error as Error)
          }
        }) as (value: unknown) => void,
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

        try {
          await request.resolve(request.url)
          this.requestCount++
          this.lastRequestTime = Date.now()
        } catch (error) {
          // Inner catch to ensure we don't crash the queue processing
          throw error
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
      // Basic check - subclasses should implement more robust validation
      return await this.makeRequest(sourceUrl, async (url) => {
        const response = await fetch(url, { method: 'HEAD' })
        return response.ok
      })
    } catch (error) {
      console.error(`Failed to validate source ${sourceUrl}:`, error)
      return false
    }
  }

  // Clean up resources
  public async cleanup(): Promise<void> {
    // To be implemented by subclasses
  }

  // Abstract methods to be implemented by concrete scrapers
  abstract searchSeries(query: string): Promise<SeriesSearchResult[]>
  abstract getSeriesDetails(seriesId: string): Promise<Series>
  abstract getTrendingContent(): Promise<TrendingContent>
  abstract getChapterPages(chapterId: string): Promise<PageUrl[]>
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