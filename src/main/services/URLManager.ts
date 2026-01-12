/**
 * URLManager - Handles manhwaz.com URL validation and construction
 * 
 * Provides centralized URL management for manhwaz.com with validation
 * and URL building utilities. Ensures all URLs are properly formatted
 * and belong to the manhwaz.com domain.
 * 
 * Requirements: 5.2, 5.3
 */
export class URLManager {
  private readonly baseUrl = 'https://manhwaz.com'
  private readonly validHostnames = ['manhwaz.com', 'www.manhwaz.com']

  /**
   * Validates if a URL belongs to manhwaz.com domain
   * @param url - URL to validate
   * @returns true if URL is valid manhwaz.com URL
   */
  validateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const parsedUrl = new URL(url)
      // Only allow https protocol for manhwaz.com
      return parsedUrl.protocol === 'https:' && this.validHostnames.includes(parsedUrl.hostname)
    } catch {
      return false
    }
  }

  /**
   * Builds search URL for manhwaz.com
   * @param query - Search query string
   * @returns Formatted search URL
   */
  buildSearchUrl(query: string): string {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('Search query must be a non-empty string')
    }

    const encodedQuery = encodeURIComponent(query.trim())
    return `${this.baseUrl}/search?s=${encodedQuery}`
  }

  /**
   * Builds series URL for manhwaz.com
   * @param seriesId - Series identifier or full URL
   * @returns Formatted series URL
   */
  buildSeriesUrl(seriesId: string): string {
    if (!seriesId || typeof seriesId !== 'string' || seriesId.trim() === '') {
      throw new Error('Series ID must be a non-empty string')
    }

    // If already a full URL, validate and return
    if (seriesId.startsWith('http')) {
      if (!this.validateUrl(seriesId)) {
        throw new Error('Invalid manhwaz.com URL provided')
      }
      return seriesId
    }

    // Build URL from series ID
    const cleanId = seriesId.trim().replace(/^\/+|\/+$/g, '')
    if (cleanId === '') {
      throw new Error('Series ID must be a non-empty string')
    }
    return `${this.baseUrl}/webtoon/${cleanId}`
  }

  /**
   * Builds chapter URL for manhwaz.com
   * @param chapterId - Chapter identifier or full URL
   * @returns Formatted chapter URL
   */
  buildChapterUrl(chapterId: string): string {
    if (!chapterId || typeof chapterId !== 'string' || chapterId.trim() === '') {
      throw new Error('Chapter ID must be a non-empty string')
    }

    // If already a full URL, validate and return
    if (chapterId.startsWith('http')) {
      if (!this.validateUrl(chapterId)) {
        throw new Error('Invalid manhwaz.com URL provided')
      }
      return chapterId
    }

    // Build URL from chapter ID
    const cleanId = chapterId.trim().replace(/^\/+|\/+$/g, '')
    if (cleanId === '') {
      throw new Error('Chapter ID must be a non-empty string')
    }
    return `${this.baseUrl}/chapter/${cleanId}`
  }

  /**
   * Gets the base URL for manhwaz.com
   * @returns Base URL string
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Builds homepage URL for manhwaz.com
   * @returns Homepage URL
   */
  buildHomepageUrl(page: number = 1): string {
    return page > 1 ? `${this.baseUrl}/page/${page}` : this.baseUrl
  }

  /**
   * Extracts series ID from a manhwaz.com series URL
   * @param url - Full series URL
   * @returns Series ID or null if invalid
   */
  extractSeriesId(url: string): string | null {
    if (!this.validateUrl(url)) {
      return null
    }

    try {
      const parsedUrl = new URL(url)
      const pathMatch = parsedUrl.pathname.match(/\/webtoon\/([^\/]+)/)
      return pathMatch ? pathMatch[1] : null
    } catch {
      return null
    }
  }

  /**
   * Extracts chapter ID from a manhwaz.com chapter URL
   * @param url - Full chapter URL
   * @returns Chapter ID or null if invalid
   */
  extractChapterId(url: string): string | null {
    if (!this.validateUrl(url)) {
      return null
    }

    try {
      const parsedUrl = new URL(url)
      const pathMatch = parsedUrl.pathname.match(/\/chapter\/([^\/]+)/)
      return pathMatch ? pathMatch[1] : null
    } catch {
      return null
    }
  }

  /**
   * Resolves relative URLs to absolute URLs using manhwaz.com base URL
   * @param url - Relative or absolute URL
   * @returns Absolute URL
   */
  resolveUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return ''
    }

    // If already absolute URL, return as is (after validation)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return `https:${url}`
    }

    // Handle absolute paths
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`
    }

    // Handle relative paths (assume they're relative to base)
    return `${this.baseUrl}/${url}`
  }
}