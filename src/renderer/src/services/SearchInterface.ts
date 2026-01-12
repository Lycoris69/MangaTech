/**
 * SearchInterface - Handles manhwaz.com search functionality
 * 
 * Implements search endpoint querying, result parsing with metadata extraction,
 * autocomplete functionality, and empty result handling.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as cheerio from 'cheerio'
import { SeriesSearchResult } from '../types'
import { URLManager } from './URLManager'
import { RateLimiter } from './RateLimiter'
import { ContentValidator } from './ContentValidator'
import { ScrapingError, ValidationError } from './WebScrapingService'
import axios, { AxiosInstance } from 'axios'
import winston from 'winston'

export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'title' | 'rating' | 'updated'
  filterBy?: {
    genres?: string[]
    status?: 'ongoing' | 'completed' | 'hiatus'
    minRating?: number
  }
}

export interface AutocompleteResult {
  suggestion: string
  type: 'series' | 'author' | 'genre'
  count?: number
}

export interface SearchResponse {
  results: SeriesSearchResult[]
  totalCount: number
  hasMore: boolean
  suggestions: AutocompleteResult[]
  query: string
}

export class SearchInterface {
  private static logger: winston.Logger
  private urlManager: URLManager
  private rateLimiter: RateLimiter
  private contentValidator: ContentValidator
  private axiosInstance: AxiosInstance

  constructor(
    urlManager: URLManager,
    rateLimiter: RateLimiter,
    contentValidator: ContentValidator
  ) {
    this.urlManager = urlManager
    this.rateLimiter = rateLimiter
    this.contentValidator = contentValidator

    // Initialize logger
    if (!SearchInterface.logger) {
      SearchInterface.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'search-interface' },
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
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
  }

  /**
   * Search for manga series on manhwaz.com
   * Requirement 3.2: Query manhwaz.com and return relevant manga results
   */
  async searchSeries(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty')
    }

    const trimmedQuery = query.trim()
    SearchInterface.logger.info('Searching series', { query: trimmedQuery, options })

    try {
      // Acquire rate limiting token
      await this.rateLimiter.acquireToken()

      // Build search URL
      const searchUrl = this.urlManager.buildSearchUrl(trimmedQuery)

      // Make HTTP request
      const response = await this.axiosInstance.get(searchUrl)
      const $ = cheerio.load(response.data)

      // Parse search results
      const results = this.parseSearchResults($, trimmedQuery)

      // Apply filters and sorting
      const filteredResults = this.applyFiltersAndSorting(results, options)

      // Extract autocomplete suggestions
      const suggestions = this.extractAutocompleteSuggestions($, trimmedQuery)

      // Handle pagination
      const totalCount = this.extractTotalCount($)
      const hasMore = this.checkHasMore($, filteredResults.length, options)

      const searchResponse: SearchResponse = {
        results: filteredResults,
        totalCount,
        hasMore,
        suggestions,
        query: trimmedQuery
      }

      // Validate response
      this.validateSearchResponse(searchResponse)

      SearchInterface.logger.info('Search completed', {
        query: trimmedQuery,
        resultCount: filteredResults.length,
        totalCount,
        hasMore
      })

      return searchResponse

    } catch (error) {
      SearchInterface.logger.error('Search failed', {
        query: trimmedQuery,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      if (error instanceof ValidationError) {
        throw error
      }

      throw new ScrapingError(
        `Search failed for query "${trimmedQuery}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_FAILED'
      )
    }
  }

  /**
   * Get autocomplete suggestions for search queries
   * Requirement 3.5: Provide autocomplete suggestions based on manhwaz.com search data
   */
  async getAutocompleteSuggestions(partialQuery: string): Promise<AutocompleteResult[]> {
    if (!partialQuery || partialQuery.trim().length < 2) {
      return []
    }

    const trimmedQuery = partialQuery.trim()
    SearchInterface.logger.debug('Getting autocomplete suggestions', { query: trimmedQuery })

    try {
      // Acquire rate limiting token
      await this.rateLimiter.acquireToken()

      // Build autocomplete URL (manhwaz.com might have an autocomplete endpoint)
      const autocompleteUrl = `${this.urlManager.getBaseUrl()}/wp-json/wp/v2/search?search=${encodeURIComponent(trimmedQuery)}&per_page=10`

      try {
        const response = await this.axiosInstance.get(autocompleteUrl)
        return this.parseAutocompleteResponse(response.data, trimmedQuery)
      } catch (autocompleteError) {
        // Fallback: perform a regular search and extract suggestions
        SearchInterface.logger.debug('Autocomplete endpoint failed, falling back to search', {
          query: trimmedQuery,
          error: autocompleteError instanceof Error ? autocompleteError.message : 'Unknown error'
        })

        const searchResponse = await this.searchSeries(trimmedQuery, { limit: 5 })
        return this.generateSuggestionsFromResults(searchResponse.results, trimmedQuery)
      }

    } catch (error) {
      SearchInterface.logger.warn('Autocomplete failed', {
        query: trimmedQuery,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
    }
  }

  /**
   * Parse search results from manhwaz.com HTML
   * Requirement 3.3: Show series titles, cover images, authors, and brief descriptions
   */
  private parseSearchResults($: cheerio.CheerioAPI, query: string): SeriesSearchResult[] {
    const results: SeriesSearchResult[] = []

    // manhwaz.com search results are typically in a grid or list format
    // Common selectors for manga sites:
    const resultSelectors = [
      '.search-results .manga-item',
      '.manga-list .manga-item',
      '.search-item',
      '.series-item',
      '.post-item',
      '.wp-manga-item'
    ]

    let $results: cheerio.Cheerio<cheerio.Element> | null = null

    // Try different selectors to find search results
    for (const selector of resultSelectors) {
      $results = $(selector)
      if ($results.length > 0) {
        SearchInterface.logger.debug(`Found search results with selector: ${selector}`, { count: $results.length })
        break
      }
    }

    if (!$results || $results.length === 0) {
      SearchInterface.logger.warn('No search results found with known selectors')
      return results
    }

    $results.each((index, element) => {
      try {
        const $item = $(element)

        // Extract basic information
        const titleElement = $item.find('h3 a, h2 a, .title a, .manga-title a, .post-title a').first()
        const title = titleElement.text().trim() || titleElement.attr('title')?.trim() || ''

        if (!title) {
          SearchInterface.logger.debug('Skipping result with no title', { index })
          return
        }

        // Extract series URL
        const seriesUrl = this.urlManager.resolveUrl(titleElement.attr('href') || '')
        if (!seriesUrl || !this.urlManager.validateUrl(seriesUrl)) {
          SearchInterface.logger.debug('Skipping result with invalid URL', { index, title, url: seriesUrl })
          return
        }

        // Extract cover image
        const imgElement = $item.find('img').first()
        const coverImageUrl = this.urlManager.resolveUrl(
          imgElement.attr('src') ||
          imgElement.attr('data-src') ||
          imgElement.attr('data-lazy-src') ||
          ''
        )

        // Extract author
        const authorElement = $item.find('.author, .manga-author, .post-author, .by-author')
        let author = authorElement.text().trim()
        if (author.startsWith('By ') || author.startsWith('Author: ')) {
          author = author.replace(/^(By |Author: )/, '')
        }
        if (!author) {
          author = 'Unknown'
        }

        // Extract synopsis/description
        const synopsisElement = $item.find('.summary, .description, .excerpt, .manga-excerpt')
        const synopsis = synopsisElement.text().trim() || ''

        // Extract genres
        const genreElements = $item.find('.genres a, .genre a, .manga-genres a')
        const genres: string[] = []
        genreElements.each((_, genreEl) => {
          const genre = $(genreEl).text().trim()
          if (genre) {
            genres.push(genre)
          }
        })

        // Extract status
        const statusElement = $item.find('.status, .manga-status')
        const statusText = statusElement.text().trim().toLowerCase()
        let status: 'ongoing' | 'completed' | 'hiatus' = 'ongoing'
        if (statusText.includes('completed') || statusText.includes('finished')) {
          status = 'completed'
        } else if (statusText.includes('hiatus') || statusText.includes('on hold')) {
          status = 'hiatus'
        }

        // Extract rating
        const ratingElement = $item.find('.rating, .score, .manga-rating')
        let rating = 0
        const ratingText = ratingElement.text().trim()
        const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/)
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1])
          // Normalize to 0-10 scale if needed
          if (rating > 10) {
            rating = rating / 10
          }
        }

        // Generate unique ID from URL
        const id = this.urlManager.extractSeriesId(seriesUrl) ||
          seriesUrl.split('/').pop() ||
          `search-${Date.now()}-${index}`

        const result: SeriesSearchResult = {
          id,
          title,
          author,
          coverImageUrl,
          synopsis,
          genres,
          status,
          rating,
          sourceUrl: seriesUrl
        }

        // Validate result
        if (this.contentValidator.validateSearchResult(result)) {
          results.push(result)
          SearchInterface.logger.debug('Parsed search result', { title, author, genres: genres.length })
        } else {
          SearchInterface.logger.debug('Search result failed validation', { title, author })
        }

      } catch (error) {
        SearchInterface.logger.warn('Failed to parse search result item', {
          index,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    SearchInterface.logger.info('Parsed search results', {
      query,
      totalParsed: results.length,
      totalFound: $results.length
    })

    return results
  }

  /**
   * Extract autocomplete suggestions from search page
   */
  private extractAutocompleteSuggestions($: cheerio.CheerioAPI, query: string): AutocompleteResult[] {
    const suggestions: AutocompleteResult[] = []

    // Extract popular searches or related terms if available
    const popularSearches = $('.popular-searches a, .trending-searches a, .related-searches a')
    popularSearches.each((_, element) => {
      const suggestion = $(element).text().trim()
      if (suggestion && suggestion.toLowerCase() !== query.toLowerCase()) {
        suggestions.push({
          suggestion,
          type: 'series'
        })
      }
    })

    // Extract genre suggestions
    const genreLinks = $('.genre-filter a, .genres a, .manga-genres a')
    genreLinks.each((_, element) => {
      const genre = $(element).text().trim()
      if (genre && genre.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          suggestion: genre,
          type: 'genre'
        })
      }
    })

    return suggestions.slice(0, 10) // Limit to 10 suggestions
  }

  /**
   * Parse autocomplete API response
   */
  private parseAutocompleteResponse(data: any, query: string): AutocompleteResult[] {
    const suggestions: AutocompleteResult[] = []

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.title && typeof item.title === 'string') {
          suggestions.push({
            suggestion: item.title,
            type: 'series'
          })
        }
      }
    }

    return suggestions.slice(0, 10)
  }

  /**
   * Generate suggestions from search results
   */
  private generateSuggestionsFromResults(results: SeriesSearchResult[], query: string): AutocompleteResult[] {
    const suggestions: AutocompleteResult[] = []

    // Add series titles as suggestions
    for (const result of results.slice(0, 5)) {
      if (result.title.toLowerCase() !== query.toLowerCase()) {
        suggestions.push({
          suggestion: result.title,
          type: 'series'
        })
      }
    }

    // Add unique authors as suggestions
    const authors = new Set<string>()
    for (const result of results) {
      if (result.author && result.author !== 'Unknown' &&
        result.author.toLowerCase().includes(query.toLowerCase())) {
        authors.add(result.author)
      }
    }

    for (const author of Array.from(authors).slice(0, 3)) {
      suggestions.push({
        suggestion: author,
        type: 'author'
      })
    }

    // Add unique genres as suggestions
    const genres = new Set<string>()
    for (const result of results) {
      for (const genre of result.genres) {
        if (genre.toLowerCase().includes(query.toLowerCase())) {
          genres.add(genre)
        }
      }
    }

    for (const genre of Array.from(genres).slice(0, 3)) {
      suggestions.push({
        suggestion: genre,
        type: 'genre'
      })
    }

    return suggestions
  }

  /**
   * Apply filters and sorting to search results
   */
  private applyFiltersAndSorting(results: SeriesSearchResult[], options: SearchOptions): SeriesSearchResult[] {
    let filteredResults = [...results]

    // Apply filters
    if (options.filterBy) {
      const { genres, status, minRating } = options.filterBy

      if (genres && genres.length > 0) {
        filteredResults = filteredResults.filter(result =>
          genres.some(genre =>
            result.genres.some(resultGenre =>
              resultGenre.toLowerCase().includes(genre.toLowerCase())
            )
          )
        )
      }

      if (status) {
        filteredResults = filteredResults.filter(result => result.status === status)
      }

      if (minRating !== undefined) {
        filteredResults = filteredResults.filter(result => result.rating >= minRating)
      }
    }

    // Apply sorting
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'title':
          filteredResults.sort((a, b) => a.title.localeCompare(b.title))
          break
        case 'rating':
          filteredResults.sort((a, b) => b.rating - a.rating)
          break
        case 'updated':
          // For search results, we don't have update dates, so maintain original order
          break
        case 'relevance':
        default:
          // Results are already in relevance order from the search
          break
      }
    }

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || filteredResults.length

    return filteredResults.slice(offset, offset + limit)
  }

  /**
   * Extract total count from search page
   */
  private extractTotalCount($: cheerio.CheerioAPI): number {
    // Look for total count indicators
    const countSelectors = [
      '.search-count',
      '.results-count',
      '.total-results',
      '.found-results'
    ]

    for (const selector of countSelectors) {
      const countElement = $(selector)
      if (countElement.length > 0) {
        const countText = countElement.text()
        const countMatch = countText.match(/(\d+)/)
        if (countMatch) {
          return parseInt(countMatch[1], 10)
        }
      }
    }

    // Fallback: count visible results
    const resultSelectors = [
      '.search-results .manga-item',
      '.manga-list .manga-item',
      '.search-item',
      '.series-item'
    ]

    for (const selector of resultSelectors) {
      const results = $(selector)
      if (results.length > 0) {
        return results.length
      }
    }

    return 0
  }

  /**
   * Check if there are more results available
   */
  private checkHasMore($: cheerio.CheerioAPI, currentCount: number, options: SearchOptions): boolean {
    // Look for pagination indicators
    const paginationSelectors = [
      '.pagination .next',
      '.page-numbers .next',
      '.nav-links .next',
      '.wp-pagenavi .next'
    ]

    for (const selector of paginationSelectors) {
      if ($(selector).length > 0) {
        return true
      }
    }

    // Check if we have a limit and got exactly that many results
    if (options.limit && currentCount >= options.limit) {
      return true
    }

    return false
  }

  /**
   * Validate search response
   */
  private validateSearchResponse(response: SearchResponse): void {
    if (!response.query || response.query.trim().length === 0) {
      throw new ValidationError('Search response must have a valid query')
    }

    if (!Array.isArray(response.results)) {
      throw new ValidationError('Search response must have results array')
    }

    if (typeof response.totalCount !== 'number' || response.totalCount < 0) {
      throw new ValidationError('Search response must have valid total count')
    }

    if (typeof response.hasMore !== 'boolean') {
      throw new ValidationError('Search response must have valid hasMore flag')
    }

    if (!Array.isArray(response.suggestions)) {
      throw new ValidationError('Search response must have suggestions array')
    }

    // Validate each result
    for (const result of response.results) {
      if (!this.contentValidator.validateSearchResult(result)) {
        throw new ValidationError(`Invalid search result: ${result.title || 'Unknown'}`)
      }
    }
  }

  /**
   * Handle empty search results with appropriate messaging
   * Requirement 3.4: Display appropriate messaging and suggest alternative searches
   */
  public generateEmptyResultsMessage(query: string, suggestions: AutocompleteResult[]): string {
    let message = `No results found for "${query}".`

    if (suggestions.length > 0) {
      const suggestionTexts = suggestions.slice(0, 3).map(s => s.suggestion)
      message += ` Try searching for: ${suggestionTexts.join(', ')}`
    } else {
      message += ' Try using different keywords or check your spelling.'
    }

    return message
  }
}