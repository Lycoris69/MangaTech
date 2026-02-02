import * as cheerio from 'cheerio'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'
import { LatestRelease } from '../types'
import { URLManager } from './URLManager'
import { RateLimiter } from './RateLimiter'
import { ContentValidator } from './ContentValidator'
import { ScrapingError, ValidationError } from './WebScrapingService'

/**
 * LatestReleasesExtractor - Extracts latest releases from manhwaz.com homepage
 * 
 * This extractor handles:
 * - Scraping the latest releases section from manhwaz.com homepage
 * - Parsing release metadata (title, chapter, cover image, date)
 * - Handling dynamic content loading for JavaScript-rendered elements
 * - Caching mechanism for latest releases data
 * 
 * Requirements: 1.1, 1.2, 4.5
 */
export class LatestReleasesExtractor {
  private static logger: winston.Logger
  private axiosInstance: AxiosInstance
  private urlManager: URLManager
  private rateLimiter: RateLimiter
  private contentValidator: ContentValidator
  private cache: Map<string, { data: LatestRelease[], timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL (Requirement 1.3)

  constructor(
    urlManager: URLManager,
    rateLimiter: RateLimiter,
    contentValidator: ContentValidator
  ) {
    this.urlManager = urlManager
    this.rateLimiter = rateLimiter
    this.contentValidator = contentValidator

    // Initialize logger
    if (!LatestReleasesExtractor.logger) {
      LatestReleasesExtractor.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'latest-releases-extractor' },
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
      LatestReleasesExtractor.logger.debug('Making HTTP request for latest releases', { url: config.url })
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        LatestReleasesExtractor.logger.error('HTTP request failed for latest releases', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Extract latest releases from manhwaz.com homepage
   * Implements caching mechanism with 30-minute TTL
   * 
   * @returns Promise<LatestRelease[]> Array of latest releases
   * @throws ScrapingError if extraction fails
   * @throws ValidationError if extracted data is invalid
   */
  async extractLatestReleases(page: number = 1): Promise<LatestRelease[]> {
    const cacheKey = `latest-releases-page-${page}`

    // Check cache first (Requirement 1.3 - refresh within 30 minutes)
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      LatestReleasesExtractor.logger.info('Returning cached latest releases', { count: cached.length })
      return cached
    }

    try {
      const homeUrl = page > 1 ? this.urlManager.buildHomepageUrl(page) : this.urlManager.getBaseUrl()
      LatestReleasesExtractor.logger.info('Extracting latest releases', { url: homeUrl, page })

      const response = await this.axiosInstance.get(homeUrl)
      const $ = cheerio.load(response.data)

      const releases = await this.parseLatestReleasesSection($)

      // Validate extracted data
      const validationResult = this.contentValidator.validateLatestReleases(releases)
      if (!validationResult.isValid) {
        throw new ValidationError(`Latest releases validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Cache the results
      this.setCachedData(cacheKey, releases)

      LatestReleasesExtractor.logger.info('Successfully extracted latest releases', {
        count: releases.length,
        cached: true
      })

      return releases

    } catch (error) {
      LatestReleasesExtractor.logger.error('Failed to extract latest releases', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      if (error instanceof ValidationError || error instanceof ScrapingError) {
        throw error
      }

      throw new ScrapingError(`Failed to extract latest releases: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse the latest releases section from the homepage HTML
   * Handles dynamic content and various HTML structures
   * 
   * @param $ Cheerio instance loaded with homepage HTML
   * @returns Promise<LatestRelease[]> Parsed latest releases
   */
  private async parseLatestReleasesSection($: cheerio.CheerioAPI): Promise<LatestRelease[]> {
    const releases: LatestRelease[] = []

    // Common selectors for latest releases sections on manhwaz.com
    const possibleSelectors = [
      '.page-item-detail',
      '.latest-releases .item',
      '.recent-updates .item',
      '.new-chapters .chapter-item',
      '.homepage-latest .manga-item',
      '.latest-manga .manga-card',
      '[data-section="latest"] .item',
      '.content-homepage-item'
    ]

    let releaseElements: cheerio.Cheerio<any> | null = null

    // Try different selectors to find the latest releases section
    for (const selector of possibleSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        releaseElements = elements
        LatestReleasesExtractor.logger.debug('Found latest releases using selector', {
          selector,
          count: elements.length
        })
        break
      }
    }

    if (!releaseElements || releaseElements.length === 0) {
      LatestReleasesExtractor.logger.warn('No latest releases found with any selector')
      return releases
    }

    // Parse each release item
    releaseElements.each((_index, element) => {
      try {
        const release = this.parseReleaseItem($, $(element), _index)
        if (release) {
          releases.push(release)
        }
      } catch (error) {
        LatestReleasesExtractor.logger.warn('Failed to parse release item', {
          index: _index,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    return releases
  }

  /**
   * Parse individual release item from HTML element
   * 
   * @param $ Cheerio instance
   * @param element Release item element
   * @param _index Item index for ID generation
   * @returns LatestRelease | null Parsed release or null if parsing fails
   */
  private parseReleaseItem($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, _index: number): LatestRelease | null {
    try {
      // Extract series title
      const titleSelectors = ['.post-title a', 'h3 a', '.title a', '.manga-title a', 'a.title', '.series-title']
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

      // Fallback: search for any link if specific selectors fail
      if (!seriesTitle) {
        const linkElement = element.find('a[href*="/webtoon/"]').first()
        if (linkElement.length > 0) {
          seriesTitle = linkElement.text().trim()
          seriesUrl = linkElement.attr('href') || ''
        }
      }

      if (!seriesTitle) {
        LatestReleasesExtractor.logger.debug('Could not extract series title', { index: _index })
        return null
      }

      // Extract chapter information
      const chapterSelectors = ['.chapter a', '.chapter-title a', '.latest-chapter a', '.chapter-number']
      let chapterNumber = ''
      let chapterTitle = ''
      let chapterUrl = ''

      for (const selector of chapterSelectors) {
        const chapterElement = element.find(selector).first()
        if (chapterElement.length > 0) {
          const chapterText = chapterElement.text().trim()
          chapterUrl = chapterElement.attr('href') || ''

          // Extract chapter number from text like "Chapter 123" or "Ch. 123"
          const chapterMatch = chapterText.match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i)
          if (chapterMatch) {
            chapterNumber = chapterMatch[1]
            chapterTitle = chapterText
          } else {
            chapterNumber = chapterText
            chapterTitle = chapterText
          }
          break
        }
      }

      if (!chapterNumber) {
        LatestReleasesExtractor.logger.debug('Could not extract chapter number', { index: _index, seriesTitle })
        return null
      }

      // Extract cover image
      const imageSelectors = ['img', '.cover img', '.thumbnail img', '.manga-thumb img']
      let coverImageUrl = ''

      for (const selector of imageSelectors) {
        const imgElement = element.find(selector).first()
        if (imgElement.length > 0) {
          coverImageUrl = imgElement.attr('src') || imgElement.attr('data-src') || ''
          if (coverImageUrl) {
            // Convert relative URLs to absolute
            coverImageUrl = this.urlManager.resolveUrl(coverImageUrl)
            break
          }
        }
      }

      // Extract publish date
      const dateSelectors = ['.post-on.font-meta', '.date', '.publish-date', '.updated', '.time', '.chapter-date']
      let publishDate = new Date()

      for (const selector of dateSelectors) {
        const dateElement = element.find(selector).first()
        if (dateElement.length > 0) {
          const dateText = dateElement.text().trim()
          const parsedDate = this.parseDate(dateText)
          if (parsedDate) {
            publishDate = parsedDate
            break
          }
        }
      }

      // Check if this is a new release (usually indicated by a "new" badge or recent date)
      const isNew = element.find('.new, .badge-new, .recent').length > 0 ||
        (Date.now() - publishDate.getTime()) < 24 * 60 * 60 * 1000 // Less than 24 hours old

      // Ensure URLs are absolute BEFORE extracting the ID
      seriesUrl = this.urlManager.resolveUrl(seriesUrl)
      chapterUrl = this.urlManager.resolveUrl(chapterUrl)

      // Generate unique ID from URL slug
      const slug = this.urlManager.extractSeriesId(seriesUrl)
      const id = slug || `manhwaz-release-${Date.now()}-${_index}`

      console.log(`[LatestReleasesExtractor] seriesUrl=${seriesUrl}, slug=${slug}, id=${id}`)

      const release: LatestRelease = {
        id,
        seriesTitle,
        chapterNumber,
        chapterTitle: chapterTitle || undefined,
        coverImageUrl: coverImageUrl || this.getPlaceholderImage(),
        publishDate,
        seriesUrl,
        chapterUrl,
        isNew
      }

      return release

    } catch (error) {
      LatestReleasesExtractor.logger.warn('Error parsing release item', {
        index: _index,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse date string into Date object
   * Handles various date formats commonly used on manga sites
   * 
   * @param dateText Date string to parse
   * @returns Date | null Parsed date or null if parsing fails
   */
  private parseDate(dateText: string): Date | null {
    if (!dateText) return null

    try {
      // Handle relative dates like "2 hours ago", "1 day ago"
      const relativeMatch = dateText.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i)
      if (relativeMatch) {
        const amount = parseInt(relativeMatch[1])
        const unit = relativeMatch[2].toLowerCase()
        const now = new Date()

        switch (unit) {
          case 'minute':
            return new Date(now.getTime() - amount * 60 * 1000)
          case 'hour':
            return new Date(now.getTime() - amount * 60 * 60 * 1000)
          case 'day':
            return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000)
          case 'week':
            return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000)
          case 'month':
            return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000)
        }
      }

      // Handle "today", "yesterday"
      if (dateText.toLowerCase().includes('today')) {
        return new Date()
      }
      if (dateText.toLowerCase().includes('yesterday')) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday
      }

      // Try parsing as standard date
      const parsed = new Date(dateText)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }

      return null
    } catch (error) {
      LatestReleasesExtractor.logger.debug('Failed to parse date', { dateText, error })
      return null
    }
  }

  /**
   * Get cached data if it exists and is not expired
   * 
   * @param key Cache key
   * @returns LatestRelease[] | null Cached data or null if not found/expired
   */
  private getCachedData(key: string): LatestRelease[] | null {
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
  private setCachedData(key: string, data: LatestRelease[]): void {
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
    LatestReleasesExtractor.logger.info('Latest releases cache cleared')
  }

  /**
   * Get placeholder image URL for releases without cover images
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