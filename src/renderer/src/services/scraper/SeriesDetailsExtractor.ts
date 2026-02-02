import * as cheerio from 'cheerio'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'
import { SeriesDetails, ChapterInfo } from '../types'
import { URLManager } from './URLManager'
import { RateLimiter } from './RateLimiter'
import { ContentValidator } from './ContentValidator'
import { ScrapingError, ValidationError } from './WebScrapingService'

/**
 * SeriesDetailsExtractor - Extracts comprehensive series details from manhwaz.com series pages
 * 
 * This extractor handles:
 * - Extracting comprehensive metadata (title, author, synopsis, genres, status)
 * - Chapter list extraction with complete chapter information
 * - Cover image processing with quality preservation
 * - Handling different page layouts and dynamic content
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export class SeriesDetailsExtractor {
  private static logger: winston.Logger
  private axiosInstance: AxiosInstance
  private urlManager: URLManager
  private rateLimiter: RateLimiter
  private contentValidator: ContentValidator
  private cache: Map<string, { data: SeriesDetails, timestamp: number }> = new Map()
  private readonly CACHE_TTL = 60 * 60 * 1000 // 1 hour cache TTL for series details

  constructor(
    urlManager: URLManager,
    rateLimiter: RateLimiter,
    contentValidator: ContentValidator
  ) {
    this.urlManager = urlManager
    this.rateLimiter = rateLimiter
    this.contentValidator = contentValidator

    // Initialize logger
    if (!SeriesDetailsExtractor.logger) {
      SeriesDetailsExtractor.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'series-details-extractor' },
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
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://manhwaz.com/',
        'Origin': 'https://manhwaz.com'
      }
    })

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquireToken()
      SeriesDetailsExtractor.logger.debug('Making HTTP request for series details', { url: config.url })
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        SeriesDetailsExtractor.logger.error('HTTP request failed for series details', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Extract comprehensive series details from manhwaz.com series page
   * Implements caching mechanism with 1-hour TTL
   * 
   * @param seriesUrl URL of the series page on manhwaz.com
   * @returns Promise<SeriesDetails> Complete series details
   * @throws ScrapingError if extraction fails
   * @throws ValidationError if extracted data is invalid
   */
  async extractSeriesDetails(seriesUrl: string): Promise<SeriesDetails> {
    if (!seriesUrl || !this.urlManager.validateUrl(seriesUrl)) {
      throw new ValidationError('Invalid series URL provided')
    }

    // UPDATED: Added -v3 suffix to force cache invalidation
    const cacheKey = `series-${seriesUrl}-v3`

    // Check cache first
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      SeriesDetailsExtractor.logger.info('Returning cached series details', { url: seriesUrl })
      return cached
    }

    try {
      SeriesDetailsExtractor.logger.info('Extracting series details', { url: seriesUrl })

      const response = await this.axiosInstance.get(seriesUrl)
      const $ = cheerio.load(response.data)

      const seriesDetails = await this.parseSeriesDetailsPage($, seriesUrl)

      // Validate extracted data (Requirement 4.4)
      const validationResult = this.contentValidator.validateSeriesDetails(seriesDetails)
      if (!validationResult.isValid) {
        throw new ValidationError(`Series details validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Cache the results
      this.setCachedData(cacheKey, seriesDetails)

      SeriesDetailsExtractor.logger.info('Successfully extracted series details', {
        title: seriesDetails.title,
        chaptersCount: seriesDetails.chapters.length,
        cached: true
      })

      return seriesDetails

    } catch (error) {
      SeriesDetailsExtractor.logger.error('Failed to extract series details', {
        url: seriesUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      if (error instanceof ValidationError || error instanceof ScrapingError) {
        throw error
      }

      throw new ScrapingError(`Failed to extract series details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse the series details page HTML to extract comprehensive metadata
   * Handles various page layouts and dynamic content (Requirement 4.5)
   * 
   * @param $ Cheerio instance loaded with series page HTML
   * @param sourceUrl Original URL for reference
   * @returns Promise<SeriesDetails> Parsed series details
   */
  private async parseSeriesDetailsPage($: any, sourceUrl: string): Promise<SeriesDetails> {
    // Extract basic series information (Requirements 4.1, 4.2)
    const title = this.extractTitle($)
    const alternativeTitles = this.extractAlternativeTitles($)
    const author = this.extractAuthor($)
    const artist = this.extractArtist($)
    const synopsis = this.extractSynopsis($)
    const coverImageUrl = this.extractCoverImage($)
    const genres = this.extractGenres($)
    const status = this.extractStatus($)
    const rating = this.extractRating($)
    const viewCount = this.extractViewCount($)
    const lastUpdated = this.extractLastUpdated($)

    // Extract chapter list with complete information (Requirement 4.2)
    const chapters = await this.extractChapterList($)

    // Generate unique ID from URL
    const id = this.generateSeriesId(sourceUrl)

    const seriesDetails: SeriesDetails = {
      id,
      title,
      alternativeTitles,
      author,
      artist,
      synopsis,
      coverImageUrl,
      genres,
      status,
      rating,
      viewCount,
      chapters,
      lastUpdated,
      sourceUrl
    }

    return seriesDetails
  }

  /**
   * Extract series title from various possible selectors
   */
  private extractTitle($: any): string {
    const titleSelectors = [
      '.post-title h1',
      '.post-title h3',
      '.series-title',
      'h1.title',
      '.manga-title'
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const title = element.text().trim()
        if (title) {
          SeriesDetailsExtractor.logger.debug('Extracted title', { title, selector })
          return title
        }
      }
    }

    throw new ScrapingError('Could not extract series title')
  }

  /**
   * Extract alternative titles
   */
  private extractAlternativeTitles($: any): string[] {
    const altTitleSelectors = [
      '.alternative-titles',
      '.alt-titles',
      '.other-names',
      '.series-alt-title'
    ]

    const altTitles: string[] = []

    for (const selector of altTitleSelectors) {
      const elements = $(selector)
      elements.each((_: any, element: any) => {
        const text = $(element).text().trim()
        if (text) {
          // Split by common separators
          const titles = text.split(/[;,\n]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          altTitles.push(...titles)
        }
      })
    }

    return [...new Set(altTitles)] // Remove duplicates
  }

  /**
   * Extract author information
   */
  private extractAuthor($: any): string {
    const authorSelectors = [
      '.author',
      '.series-author',
      '.manga-author',
      '.creator',
      '[data-field="author"]',
      '.info-item:contains("Author") + .info-value',
      '.author-name'
    ]

    for (const selector of authorSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const author = element.text().trim()
        if (author && !author.toLowerCase().includes('unknown')) {
          SeriesDetailsExtractor.logger.debug('Extracted author', { author, selector })
          return author
        }
      }
    }

    return 'Unknown'
  }

  /**
   * Extract artist information
   */
  private extractArtist($: any): string {
    const artistSelectors = [
      '.artist',
      '.series-artist',
      '.manga-artist',
      '[data-field="artist"]',
      '.info-item:contains("Artist") + .info-value'
    ]

    for (const selector of artistSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const artist = element.text().trim()
        if (artist && !artist.toLowerCase().includes('unknown')) {
          SeriesDetailsExtractor.logger.debug('Extracted artist', { artist, selector })
          return artist
        }
      }
    }

    return ''
  }

  /**
   * Extract synopsis/description
   */
  private extractSynopsis($: any): string {
    const synopsisSelectors = [
      '.description-summary .summary__content',
      '.synopsis',
      '.description',
      '.summary',
      '.series-description',
      '.manga-description',
      '.plot',
      '.story'
    ]

    for (const selector of synopsisSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let synopsis = element.text().trim()

        // --- CLEANUP LOGIC ---

        // 1. PRIMARY: Check for specific "The Summary is" delimiter and take everything after it
        const summaryMatch = synopsis.match(/The Summary is\s*([\s\S]*)/i);
        if (summaryMatch && summaryMatch[1]) {
          synopsis = summaryMatch[1].trim();
        } else {
          // 2. FALLBACK: Remove specific SEO patterns

          synopsis = synopsis.replace(/^.*?is a (Manga|Manhwa|Manhua).*?read them here\./is, '').trim();
          synopsis = synopsis.replace(/^.*?is a (Manga|Manhwa|Manhua).*?comic site\./is, '').trim();
          synopsis = synopsis.replace(/You are reading chapters on.*?(site|website|game|comic site)\./is, '').trim();
        }

        // 3. CLEANUP: Artifacts
        synopsis = synopsis.replace(/Read\s+.*?\s+at\s+[\w.]+/i, '').trim();

        if (synopsis && synopsis.length > 10) {
          SeriesDetailsExtractor.logger.debug('Extracted synopsis', {
            length: synopsis.length,
            selector
          })
          return synopsis
        }
      }
    }

    return ''
  }

  /**
   * Extract and process cover image with quality preservation (Requirement 4.3)
   */
  private extractCoverImage($: any): string {
    const imageSelectors = [
      '.summary_image img',
      '.series-cover img',
      '.manga-cover img',
      '.cover-image img',
      '.thumbnail img',
      '.series-thumb img',
      '.poster img'
    ]

    for (const selector of imageSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let imageUrl = element.attr('src') || element.attr('data-src') || element.attr('data-lazy-src') || ''

        if (imageUrl) {
          // Convert relative URLs to absolute
          imageUrl = this.urlManager.resolveUrl(imageUrl)

          // Prefer higher quality versions if available
          imageUrl = this.optimizeImageUrl(imageUrl)

          SeriesDetailsExtractor.logger.debug('Extracted cover image', { imageUrl, selector })
          return imageUrl
        }
      }
    }

    return this.getPlaceholderImage()
  }

  /**
   * Optimize image URL for better quality (Requirement 4.3)
   */
  private optimizeImageUrl(imageUrl: string): string {
    // Replace common low-quality indicators with high-quality versions
    const optimizations = [
      { from: /\/thumb\//, to: '/full/' },
      { from: /\/small\//, to: '/large/' },
      { from: /\/150x/, to: '/300x' },
      { from: /\/200x/, to: '/400x' },
      { from: /_small\./, to: '_large.' },
      { from: /_thumb\./, to: '_full.' }
    ]

    let optimizedUrl = imageUrl
    for (const opt of optimizations) {
      optimizedUrl = optimizedUrl.replace(opt.from, opt.to)
    }

    return optimizedUrl
  }

  /**
   * Extract genres
   */
  private extractGenres($: any): string[] {
    const genreSelectors = [
      '.genres a',
      '.genre-list a',
      '.tags a',
      '.categories a',
      '.genre-item',
      '.tag-item'
    ]

    const genres: string[] = []

    for (const selector of genreSelectors) {
      const elements = $(selector)
      elements.each((_: any, element: any) => {
        const genre = $(element).text().trim()
        if (genre && !genres.includes(genre)) {
          genres.push(genre)
        }
      })

      if (genres.length > 0) {
        break // Use first successful selector
      }
    }

    SeriesDetailsExtractor.logger.debug('Extracted genres', { genres, count: genres.length })
    return genres
  }

  /**
   * Extract series status
   */
  private extractStatus($: any): 'ongoing' | 'completed' | 'hiatus' {
    const statusSelectors = [
      '.status',
      '.series-status',
      '.manga-status',
      '[data-field="status"]',
      '.info-item:contains("Status") + .info-value'
    ]

    for (const selector of statusSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const statusText = element.text().trim().toLowerCase()

        if (statusText.includes('completed') || statusText.includes('finished')) {
          return 'completed'
        }
        if (statusText.includes('hiatus') || statusText.includes('paused')) {
          return 'hiatus'
        }
        if (statusText.includes('ongoing') || statusText.includes('active')) {
          return 'ongoing'
        }
      }
    }

    return 'ongoing' // Default assumption
  }

  /**
   * Extract rating
   */
  private extractRating($: any): number {
    const ratingSelectors = [
      '.rating',
      '.score',
      '.stars',
      '[data-field="rating"]'
    ]

    for (const selector of ratingSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const ratingText = element.text().trim()
        const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);

        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1])
          if (rating >= 0 && rating <= 10) {
            SeriesDetailsExtractor.logger.debug('Extracted rating', { rating, selector })
            return rating
          }
        }
      }
    }

    return 0
  }

  /**
   * Extract view count
   */
  private extractViewCount($: any): number {
    const viewSelectors = [
      '.views',
      '.view-count',
      '.total-views',
      '[data-field="views"]'
    ]

    for (const selector of viewSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const viewText = element.text().trim()
        const viewMatch = viewText.match(/(\d+(?:,\d+)*)/);

        if (viewMatch) {
          const viewCount = parseInt(viewMatch[1].replace(/,/g, ''))
          if (!isNaN(viewCount)) {
            SeriesDetailsExtractor.logger.debug('Extracted view count', { viewCount, selector })
            return viewCount
          }
        }
      }
    }

    return 0
  }

  /**
   * Extract last updated date
   */
  private extractLastUpdated($: any): Date {
    const dateSelectors = [
      '.last-updated',
      '.updated-date',
      '.latest-update',
      '[data-field="updated"]'
    ]

    for (const selector of dateSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const dateText = element.text().trim()
        const parsedDate = this.parseDate(dateText)
        if (parsedDate) {
          SeriesDetailsExtractor.logger.debug('Extracted last updated', { date: parsedDate, selector })
          return parsedDate
        }
      }
    }

    return new Date() // Default to current date
  }

  /**
   * Extract complete chapter list with information (Requirement 4.2)
   */
  private async extractChapterList($: any): Promise<ChapterInfo[]> {
    const chapters: ChapterInfo[] = []

    const chapterSelectors = [
      '.wp-manga-chapter',
      '.chapter-list .chapter-item',
      '.chapters .chapter',
      '.episode-list .episode',
      '.chapter-row',
      '.chapter-entry'
    ]

    let chapterElements: any = null

    // Try different selectors to find the chapter list
    for (const selector of chapterSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        chapterElements = elements
        SeriesDetailsExtractor.logger.debug('Found chapters using selector', {
          selector,
          count: elements.length
        })
        break
      }
    }

    if (!chapterElements || chapterElements.length === 0) {
      SeriesDetailsExtractor.logger.warn('No chapters found with any selector')
      return chapters
    }

    // Parse each chapter item
    chapterElements.each((index: number, element: any) => {
      try {
        const chapter = this.parseChapterItem($, $(element), index)
        if (chapter) {
          chapters.push(chapter)
        }
      } catch (error) {
        SeriesDetailsExtractor.logger.warn('Failed to parse chapter item', {
          index,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // Sort chapters by chapter number (ascending)
    chapters.sort((a, b) => {
      const aNum = parseFloat(a.chapterNumber) || 0
      const bNum = parseFloat(b.chapterNumber) || 0
      return aNum - bNum
    })

    SeriesDetailsExtractor.logger.debug('Extracted chapters', { count: chapters.length })
    return chapters
  }

  /**
   * Parse individual chapter item from HTML element
   */
  private parseChapterItem($: any, element: any, index: number): ChapterInfo | null {
    try {
      // Extract chapter title and URL
      const titleSelectors = ['a', '.chapter-title a', '.chapter-name a', '.title']
      let chapterTitle = ''
      let chapterUrl = ''

      for (const selector of titleSelectors) {
        const titleElement = element.find(selector).first()
        if (titleElement.length > 0) {
          chapterTitle = titleElement.text().trim()
          chapterUrl = titleElement.attr('href') || ''
          break
        }
      }

      if (!chapterTitle) {
        SeriesDetailsExtractor.logger.debug('Could not extract chapter title', { index })
        return null
      }

      // Extract chapter number from title
      let chapterNumber = ''
      const chapterMatch = chapterTitle.match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i)
      if (chapterMatch) {
        chapterNumber = chapterMatch[1]
      } else {
        // Try to extract number from any part of the title
        const numberMatch = chapterTitle.match(/(\d+(?:\.\d+)?)/)
        if (numberMatch) {
          chapterNumber = numberMatch[1]
        } else {
          chapterNumber = (index + 1).toString()
        }
      }

      // Extract publish date
      const dateSelectors = ['.chapter-release-date i', '.date', '.publish-date', '.updated', '.time']
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

      // Generate unique stable ID
      // We use the full resolved absolute URL as the stable ID.
      // This ensures consistency across the app (Downloads, Reading Progress, and OnlineReader).
      let id = `chapter-${chapterNumber}-stable-${index}`
      try {
        const fullUrl = this.urlManager.resolveUrl(chapterUrl)
        if (fullUrl) id = fullUrl
      } catch (e) {
        // Fallback to index-based ID if URL is invalid
      }

      // Ensure URL is absolute
      chapterUrl = this.urlManager.resolveUrl(chapterUrl)

      const chapter: ChapterInfo = {
        id,
        chapterNumber,
        title: chapterTitle,
        publishDate,
        chapterUrl,
        pageCount: undefined // Will be extracted when chapter is accessed
      }

      return chapter

    } catch (error) {
      SeriesDetailsExtractor.logger.warn('Error parsing chapter item', {
        index,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse date string into Date object
   * Handles various date formats commonly used on manga sites
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
      SeriesDetailsExtractor.logger.debug('Failed to parse date', { dateText, error })
      return null
    }
  }

  /**
   * Generate unique series ID from URL
   */
  private generateSeriesId(sourceUrl: string): string {
    // Extract series identifier from URL
    const urlParts = sourceUrl.split('/')
    // Filter out empty parts
    const cleanParts = urlParts.filter(p => p.length > 0)

    // Usually the slug is the last part
    const seriesSlug = cleanParts[cleanParts.length - 1]

    // Use consistent ID format without timestamp
    return `manhwaz-series-${seriesSlug}`
  }

  /**
   * Get cached data if it exists and is not expired
   */
  private getCachedData(key: string): SeriesDetails | null {
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
   */
  private setCachedData(key: string, data: SeriesDetails): void {
    this.cache.set(key, {
      data: { ...data }, // Create a copy to avoid mutations
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear()
    SeriesDetailsExtractor.logger.info('Series details cache cleared')
  }

  /**
   * Get placeholder image URL for series without cover images
   */
  private getPlaceholderImage(): string {
    return '/placeholder-cover.jpg' // This should match the placeholder in public folder
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}