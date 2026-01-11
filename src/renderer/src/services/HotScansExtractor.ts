import * as cheerio from 'cheerio'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'
import { HotScan } from '../types'
import { URLManager } from './URLManager'
import { RateLimiter } from './RateLimiter'
import { ContentValidator } from './ContentValidator'
import { ScrapingError, ValidationError } from './WebScrapingService'

/**
 * HotScansExtractor - Extracts trending manga content from manhwaz.com
 * 
 * This extractor handles:
 * - Scraping the hot scans/trending section from manhwaz.com homepage
 * - Extracting ranking data, view counts, and popularity metrics
 * - Implementing content organization following manhwaz.com categorization
 * - Adding validation for hot scans metadata completeness
 * 
 * Requirements: 2.1, 2.2, 6.4
 */
export class HotScansExtractor {
  private static logger: winston.Logger
  private axiosInstance: AxiosInstance
  private urlManager: URLManager
  private rateLimiter: RateLimiter
  private contentValidator: ContentValidator
  private cache: Map<string, { data: HotScan[], timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL

  constructor(
    urlManager: URLManager,
    rateLimiter: RateLimiter,
    contentValidator: ContentValidator
  ) {
    this.urlManager = urlManager
    this.rateLimiter = rateLimiter
    this.contentValidator = contentValidator

    // Initialize logger
    if (!HotScansExtractor.logger) {
      HotScansExtractor.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'hot-scans-extractor' },
        transports: [
          new winston.transports.Console({
            format: winston.format.simple()
          })
        ]
      })
    }

    // Configure axios instance
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquireToken()
      HotScansExtractor.logger.debug('Making HTTP request for hot scans', { url: config.url })
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        HotScansExtractor.logger.error('HTTP request failed for hot scans', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Extract hot scans/trending content from manhwaz.com homepage
   * Implements caching mechanism with 30-minute TTL
   * 
   * @returns Promise<HotScan[]> Array of hot scans/trending manga
   * @throws ScrapingError if extraction fails
   * @throws ValidationError if extracted data is invalid
   */
  async extractHotScans(): Promise<HotScan[]> {
    const cacheKey = 'hot-scans'
    
    // Check cache first (Requirement 2.3 - update when content changes)
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      HotScansExtractor.logger.info('Returning cached hot scans', { count: cached.length })
      return cached
    }

    try {
      const homeUrl = this.urlManager.getBaseUrl()
      HotScansExtractor.logger.info('Extracting hot scans from homepage', { url: homeUrl })

      const response = await this.axiosInstance.get(homeUrl)
      const $ = cheerio.load(response.data)

      const hotScans = await this.parseHotScansSection($)
      
      // Validate extracted data
      const validationResult = this.contentValidator.validateHotScans(hotScans)
      if (!validationResult.isValid) {
        throw new ValidationError(`Hot scans validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Cache the results
      this.setCachedData(cacheKey, hotScans)
      
      HotScansExtractor.logger.info('Successfully extracted hot scans', { 
        count: hotScans.length,
        cached: true
      })

      return hotScans

    } catch (error) {
      HotScansExtractor.logger.error('Failed to extract hot scans', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      if (error instanceof ValidationError || error instanceof ScrapingError) {
        throw error
      }

      throw new ScrapingError(`Failed to extract hot scans: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse the hot scans/trending section from the homepage HTML
   * Handles various HTML structures and ranking data
   * 
   * @param $ Cheerio instance loaded with homepage HTML
   * @returns Promise<HotScan[]> Parsed hot scans
   */
  private async parseHotScansSection($: cheerio.CheerioAPI): Promise<HotScan[]> {
    const hotScans: HotScan[] = []

    // Common selectors for hot scans/trending sections on manhwaz.com
    const possibleSelectors = [
      '.hot-manga .item',
      '.trending-manga .item',
      '.popular-manga .manga-item',
      '.hot-scans .manga-card',
      '.most-popular .item',
      '[data-section="trending"] .item',
      '[data-section="popular"] .item',
      '.homepage-trending .manga-item',
      '.featured-manga .item',
      '.top-rated .manga-card'
    ]

    let hotScanElements: cheerio.Cheerio<cheerio.Element> | null = null

    // Try different selectors to find the hot scans section
    for (const selector of possibleSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        hotScanElements = elements
        HotScansExtractor.logger.debug('Found hot scans using selector', { 
          selector, 
          count: elements.length 
        })
        break
      }
    }

    if (!hotScanElements || hotScanElements.length === 0) {
      HotScansExtractor.logger.warn('No hot scans found with any selector')
      return hotScans
    }

    // Parse each hot scan item
    hotScanElements.each((index, element) => {
      try {
        const hotScan = this.parseHotScanItem($, $(element), index)
        if (hotScan) {
          hotScans.push(hotScan)
        }
      } catch (error) {
        HotScansExtractor.logger.warn('Failed to parse hot scan item', {
          index,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // Sort by rank to maintain manhwaz.com categorization (Requirement 6.4)
    return hotScans.sort((a, b) => a.rank - b.rank)
  }

  /**
   * Parse individual hot scan item from HTML element
   * 
   * @param $ Cheerio instance
   * @param element Hot scan item element
   * @param index Item index for ranking and ID generation
   * @returns HotScan | null Parsed hot scan or null if parsing fails
   */
  private parseHotScanItem($: cheerio.CheerioAPI, element: cheerio.Cheerio<cheerio.Element>, index: number): HotScan | null {
    try {
      // Extract series title
      const titleSelectors = ['h3 a', '.title a', '.manga-title a', 'a.title', '.series-title', '.name a']
      let seriesTitle = ''
      let seriesUrl = ''

      for (const selector of titleSelectors) {
        const titleElement = element.find(selector).first()
        if (titleElement.length > 0) {
          seriesTitle = titleElement.text().trim()
          seriesUrl = titleElement.attr('href') || ''
          break
        }
      }

      if (!seriesTitle) {
        HotScansExtractor.logger.debug('Could not extract series title', { index })
        return null
      }

      // Extract cover image
      const imageSelectors = ['img', '.cover img', '.thumbnail img', '.manga-thumb img', '.poster img']
      let coverImageUrl = ''

      for (const selector of imageSelectors) {
        const imgElement = element.find(selector).first()
        if (imgElement.length > 0) {
          coverImageUrl = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-lazy') || ''
          if (coverImageUrl) {
            // Convert relative URLs to absolute
            coverImageUrl = this.urlManager.resolveUrl(coverImageUrl)
            break
          }
        }
      }

      // Extract rating (Requirements 2.2 - include rankings, view counts)
      const ratingSelectors = ['.rating', '.score', '.stars', '.rate', '.rating-value']
      let rating = 0

      for (const selector of ratingSelectors) {
        const ratingElement = element.find(selector).first()
        if (ratingElement.length > 0) {
          const ratingText = ratingElement.text().trim()
          const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1])
            // Normalize rating to 0-10 scale if needed
            if (rating > 10) {
              rating = rating / 10
            }
            break
          }
        }
      }

      // Extract view count
      const viewSelectors = ['.views', '.view-count', '.reads', '.popularity', '.view-number']
      let viewCount = 0

      for (const selector of viewSelectors) {
        const viewElement = element.find(selector).first()
        if (viewElement.length > 0) {
          const viewText = viewElement.text().trim()
          viewCount = this.parseViewCount(viewText)
          if (viewCount > 0) break
        }
      }

      // Extract rank (use index + 1 if no explicit rank found)
      const rankSelectors = ['.rank', '.position', '.number', '.ranking']
      let rank = index + 1 // Default to position in list

      for (const selector of rankSelectors) {
        const rankElement = element.find(selector).first()
        if (rankElement.length > 0) {
          const rankText = rankElement.text().trim()
          const rankMatch = rankText.match(/(\d+)/)
          if (rankMatch) {
            rank = parseInt(rankMatch[1])
            break
          }
        }
      }

      // Extract genres
      const genreSelectors = ['.genres', '.tags', '.categories', '.genre-list']
      const genres: string[] = []

      for (const selector of genreSelectors) {
        const genreElements = element.find(selector)
        if (genreElements.length > 0) {
          genreElements.find('a, span, .tag').each((_, genreEl) => {
            const genre = $(genreEl).text().trim()
            if (genre && !genres.includes(genre)) {
              genres.push(genre)
            }
          })
          if (genres.length > 0) break
        }
      }

      // Extract status
      const statusSelectors = ['.status', '.manga-status', '.publication-status']
      let status: 'ongoing' | 'completed' = 'ongoing' // Default to ongoing

      for (const selector of statusSelectors) {
        const statusElement = element.find(selector).first()
        if (statusElement.length > 0) {
          const statusText = statusElement.text().trim().toLowerCase()
          if (statusText.includes('completed') || statusText.includes('finished')) {
            status = 'completed'
          }
          break
        }
      }

      // Extract last chapter
      const chapterSelectors = ['.latest-chapter', '.last-chapter', '.chapter-info', '.newest-chapter']
      let lastChapter = 'N/A'

      for (const selector of chapterSelectors) {
        const chapterElement = element.find(selector).first()
        if (chapterElement.length > 0) {
          const chapterText = chapterElement.text().trim()
          // Extract chapter number from text like "Chapter 123" or "Ch. 123"
          const chapterMatch = chapterText.match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i)
          if (chapterMatch) {
            lastChapter = `Chapter ${chapterMatch[1]}`
          } else if (chapterText) {
            lastChapter = chapterText
          }
          break
        }
      }

      // Generate unique ID
      const id = `manhwaz-hotscan-${Date.now()}-${index}`

      // Ensure URLs are absolute
      seriesUrl = this.urlManager.resolveUrl(seriesUrl)

      const hotScan: HotScan = {
        id,
        seriesTitle,
        coverImageUrl: coverImageUrl || this.getPlaceholderImage(),
        rating,
        viewCount,
        rank,
        genres,
        status,
        seriesUrl,
        lastChapter
      }

      return hotScan

    } catch (error) {
      HotScansExtractor.logger.warn('Error parsing hot scan item', {
        index,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse view count string into number
   * Handles formats like "1.2K", "500M", "1.5B", etc.
   * 
   * @param viewText View count string to parse
   * @returns number Parsed view count
   */
  private parseViewCount(viewText: string): number {
    if (!viewText) return 0

    try {
      // Remove non-numeric characters except K, M, B, and decimal points
      const cleanText = viewText.replace(/[^\d.KMB]/gi, '').toUpperCase()
      
      if (!cleanText) return 0

      // Handle suffixes
      if (cleanText.includes('B')) {
        const num = parseFloat(cleanText.replace('B', ''))
        return Math.floor(num * 1000000000)
      } else if (cleanText.includes('M')) {
        const num = parseFloat(cleanText.replace('M', ''))
        return Math.floor(num * 1000000)
      } else if (cleanText.includes('K')) {
        const num = parseFloat(cleanText.replace('K', ''))
        return Math.floor(num * 1000)
      } else {
        return parseInt(cleanText) || 0
      }
    } catch (error) {
      HotScansExtractor.logger.debug('Failed to parse view count', { viewText, error })
      return 0
    }
  }

  /**
   * Get cached data if it exists and is not expired
   * 
   * @param key Cache key
   * @returns HotScan[] | null Cached data or null if not found/expired
   */
  private getCachedData(key: string): HotScan[] | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set data in cache with current timestamp
   * 
   * @param key Cache key
   * @param data Data to cache
   */
  private setCachedData(key: string, data: HotScan[]): void {
    this.cache.set(key, {
      data: [...data], // Create a copy to avoid mutations
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear()
    HotScansExtractor.logger.info('Hot scans cache cleared')
  }

  /**
   * Get placeholder image URL for hot scans without cover images
   * 
   * @returns string Placeholder image URL
   */
  private getPlaceholderImage(): string {
    return '/placeholder-cover.jpg' // This should match the placeholder in public folder
  }

  /**
   * Get cache statistics
   * 
   * @returns Object with cache statistics
   */
  public getCacheStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}