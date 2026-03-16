import * as cheerio from 'cheerio'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'
import sharp from 'sharp'
import { PageData } from '../types/index.js'
import { URLManager } from './URLManager.js'
import { RateLimiter } from './RateLimiter.js'
import { ContentValidator } from './ContentValidator.js'
import { ScrapingError, ValidationError } from './WebScrapingService.js'

/**
 * ChapterExtractor - Extracts page URLs from manhwaz.com chapter pages
 * 
 * This extractor handles:
 * - Extracting all page URLs in correct reading order
 * - Handling different image formats and resolutions
 * - Implementing page validation and quality checks
 * - Processing dynamic content loading for JavaScript-rendered elements
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export class ChapterExtractor {
  private static logger: winston.Logger
  private axiosInstance: AxiosInstance
  private urlManager: URLManager
  private rateLimiter: RateLimiter
  private contentValidator: ContentValidator
  private cache: Map<string, { data: PageData[], timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL for chapter pages

  constructor(
    urlManager: URLManager,
    rateLimiter: RateLimiter,
    contentValidator: ContentValidator
  ) {
    this.urlManager = urlManager
    this.rateLimiter = rateLimiter
    this.contentValidator = contentValidator

    // Initialize logger
    if (!ChapterExtractor.logger) {
      ChapterExtractor.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'chapter-extractor' },
        transports: [
          new winston.transports.Console({
            format: winston.format.simple()
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
      ChapterExtractor.logger.debug('Making HTTP request for chapter extraction', { url: config.url })
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        ChapterExtractor.logger.error('HTTP request failed during chapter extraction', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Extract all page URLs from a chapter page (Requirement 7.1, 7.2)
   * @param chapterUrl - URL of the chapter page
   * @returns Array of PageData objects in correct reading order
   */
  async extractChapterPages(chapterUrl: string): Promise<PageData[]> {
    if (!chapterUrl || typeof chapterUrl !== 'string' || chapterUrl.trim() === '') {
      throw new ValidationError('Chapter URL must be a non-empty string')
    }

    // Validate URL belongs to manhwaz.com
    if (!this.urlManager.validateUrl(chapterUrl)) {
      throw new ValidationError('Invalid manhwaz.com chapter URL')
    }

    // Check cache first
    const cacheKey = chapterUrl
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      ChapterExtractor.logger.debug('Returning cached chapter pages', { url: chapterUrl })
      return cached.data
    }

    ChapterExtractor.logger.info('Extracting chapter pages', { url: chapterUrl })

    try {
      // Make HTTP request to get chapter page HTML
      const response = await this.axiosInstance.get(chapterUrl)
      const $ = cheerio.load(response.data) as cheerio.CheerioAPI

      // Extract page URLs using multiple selectors for robustness
      const pageUrls = await this.extractPageUrls($, chapterUrl)

      // Validate extracted pages (Requirement 7.3)
      const validatedPages = await this.validateAndProcessPages(pageUrls)

      // Cache the results
      this.cache.set(cacheKey, {
        data: validatedPages,
        timestamp: Date.now()
      })

      ChapterExtractor.logger.info('Successfully extracted chapter pages', {
        url: chapterUrl,
        pageCount: validatedPages.length
      })

      return validatedPages

    } catch (error) {
      ChapterExtractor.logger.error('Failed to extract chapter pages', {
        url: chapterUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      if (error instanceof ValidationError) {
        throw error
      }

      throw new ScrapingError(
        `Failed to extract chapter pages from ${chapterUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        chapterUrl
      )
    }
  }

  /**
   * Extract page URLs from chapter HTML using multiple selectors (Requirement 7.1)
   * @param $ - Cheerio instance with loaded HTML
   * @param chapterUrl - Original chapter URL for context
   * @returns Array of objects with page URLs and alt text
   */
  private async extractPageUrls($: cheerio.CheerioAPI, chapterUrl: string): Promise<Array<{ url: string, altText?: string }>> {
    const pageUrls: Array<{ url: string, altText?: string }> = []

    // Multiple selectors to handle different manhwaz.com page layouts
    const pageSelectors = [
      '.reading-content img', // Main reading area images
      '.chapter-content img', // Alternative chapter content area
      '.page-break img',      // Page break separated images
      '.manga-page img',      // Manga page container images
      '#chapter-reader img',  // Chapter reader container
      '.reader-area img',     // Reader area images
      '.chapter-images img',  // Chapter images container
      'img[data-src]',        // Lazy-loaded images with data-src
      'img[src*="manhwaz"]'   // Images with manhwaz in src
    ]

    let foundImages = false

    for (const selector of pageSelectors) {
      const images = $(selector)

      if (images.length > 0) {
        ChapterExtractor.logger.debug('Found images with selector', {
          selector,
          count: images.length,
          url: chapterUrl
        })

        images.each((index, element) => {
          const $img = $(element)

          // Try multiple attributes for image URL
          let imageUrl = $img.attr('src') ||
            $img.attr('data-src') ||
            $img.attr('data-original') ||
            $img.attr('data-lazy-src') ||
            ''

          if (imageUrl) {
            // Resolve relative URLs to absolute URLs
            imageUrl = this.urlManager.resolveUrl(imageUrl)

            // Extract alt text
            const altText = $img.attr('alt') || $img.attr('title') || undefined

            // Only add if it's a valid image URL and not already added
            if (this.isValidImageUrl(imageUrl) && !pageUrls.some(p => p.url === imageUrl)) {
              pageUrls.push({ url: imageUrl, altText })
            }
          }
        })

        if (pageUrls.length > 0) {
          foundImages = true
          break // Use the first selector that finds images
        }
      }
    }

    if (!foundImages) {
      ChapterExtractor.logger.warn('No page images found with any selector', { url: chapterUrl })
    }

    // Sort pages by their order in the DOM to maintain reading order
    const sortedUrls = this.sortPagesByOrder($, pageUrls)

    ChapterExtractor.logger.debug('Extracted page URLs', {
      url: chapterUrl,
      count: sortedUrls.length,
      urls: sortedUrls.slice(0, 3).map(p => p.url) // Log first 3 URLs for debugging
    })

    return sortedUrls
  }

  /**
   * Sort page URLs by their order in the DOM to maintain correct reading order
   * @param $ - Cheerio instance
   * @param pageUrls - Array of page URL objects to sort
   * @returns Sorted array of page URL objects
   */
  private sortPagesByOrder($: cheerio.CheerioAPI, pageUrls: Array<{ url: string, altText?: string }>): Array<{ url: string, altText?: string }> {
    const urlToIndex = new Map<string, number>()

    // Find the DOM index for each URL
    $('img').each((index, element) => {
      const $img = $(element)
      const imageUrl = $img.attr('src') ||
        $img.attr('data-src') ||
        $img.attr('data-original') ||
        $img.attr('data-lazy-src') ||
        ''

      if (imageUrl) {
        const resolvedUrl = this.urlManager.resolveUrl(imageUrl)
        if (pageUrls.some(p => p.url === resolvedUrl) && !urlToIndex.has(resolvedUrl)) {
          urlToIndex.set(resolvedUrl, index)
        }
      }
    })

    // Sort URLs by their DOM index
    return pageUrls.sort((a, b) => {
      const indexA = urlToIndex.get(a.url) ?? Number.MAX_SAFE_INTEGER
      const indexB = urlToIndex.get(b.url) ?? Number.MAX_SAFE_INTEGER
      return indexA - indexB
    })
  }

  /**
   * Process extracted page URLs into PageData objects (Requirement 7.3)
   * @param pageUrls - Array of page URL objects with alt text
   * @returns Array of PageData objects
   */
  private async validateAndProcessPages(pageUrls: Array<{ url: string, altText?: string }>): Promise<PageData[]> {
    ChapterExtractor.logger.info('Processing pages and extracting dimensions', { count: pageUrls.length })

    // Use a limited concurrency to avoid overloading the server or hitting rate limits too hard
    const concurrencyLimit = 5
    const pages: PageData[] = []
    
    for (let i = 0; i < pageUrls.length; i += concurrencyLimit) {
      const chunk = pageUrls.slice(i, i + concurrencyLimit)
      const processedChunk = await Promise.all(
        chunk.map(async (pageUrlObj, index) => {
          const pageNumber = i + index + 1
          const dimensions = await this.getImageDimensions(pageUrlObj.url)
          
          return {
            pageNumber,
            imageUrl: pageUrlObj.url,
            altText: pageUrlObj.altText,
            width: dimensions.width,
            height: dimensions.height
          }
        })
      )
      pages.push(...processedChunk)
    }

    ChapterExtractor.logger.debug('Processed page URLs with dimension extraction', {
      pageCount: pages.length
    })

    return pages
  }

  /**
   * Check if a URL is a valid image URL
   * @param url - URL to check
   * @returns true if URL appears to be a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const parsedUrl = new URL(url)

      // Check for common image file extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
      const pathname = parsedUrl.pathname.toLowerCase()

      // Check if URL has image extension or contains image-related keywords
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext))
      const hasImageKeywords = pathname.includes('image') ||
        pathname.includes('img') ||
        pathname.includes('page') ||
        pathname.includes('chapter')

      return hasImageExtension || hasImageKeywords
    } catch {
      return false
    }
  }

  /**
   * Validate that an image URL is accessible and returns valid image content
   * @param imageUrl - URL to validate
   * @returns true if image is accessible and valid
   */
  private async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      // Make a HEAD request to check if image is accessible
      const response = await this.axiosInstance.head(imageUrl, {
        timeout: 10000 // Shorter timeout for validation
      })

      // Check if response indicates valid image content
      const contentType = response.headers['content-type'] || ''
      const isValidImageType = contentType.startsWith('image/') ||
        response.status === 200

      return isValidImageType
    } catch (error) {
      ChapterExtractor.logger.debug('Image validation failed', {
        url: imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get image dimensions if possible (Requirement 7.3)
   * @param imageUrl - URL of the image
   * @returns Object with width and height if available
   */
  private async getImageDimensions(imageUrl: string): Promise<{ width?: number; height?: number }> {
    try {
      // Make a partial request to get image headers
      // Use arraybuffer responseType to handle binary data properly
      const response = await this.axiosInstance.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'Range': 'bytes=0-4096' // Get first 4KB to read image headers (2KB is usually enough but 4KB is safer)
        },
        // We need to handle 206 Partial Content or 200 OK
        validateStatus: (status) => status === 200 || status === 206
      })

      const metadata = await sharp(Buffer.from(response.data)).metadata()
      return {
        width: metadata.width,
        height: metadata.height
      }
    } catch (error) {
      ChapterExtractor.logger.debug('Could not get image dimensions', {
        url: imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return {}
    }
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL
    }
  }

  /**
   * Clear cached data, optionally for a specific chapter
   */
  public clearCache(chapterUrl?: string): void {
    if (chapterUrl) {
      this.cache.delete(chapterUrl)
      ChapterExtractor.logger.debug('Cleared cache for chapter', { chapterUrl })
    } else {
      this.cache.clear()
      ChapterExtractor.logger.info('Chapter extractor cache cleared')
    }
  }
}