import { SeriesSearchResult, TrendingContent } from '../types'
import { ScraperManager } from './ScraperManager'
import { ScrapingError } from './WebScrapingService'

// Search result categorization types
export type ContentType = 'manga' | 'manhua' | 'webtoon' | 'unknown'

export interface CategorizedSearchResult extends SeriesSearchResult {
  contentType: ContentType
  relevanceScore: number
}

export interface CategorizedSearchResults {
  manga: CategorizedSearchResult[]
  manhua: CategorizedSearchResult[]
  webtoon: CategorizedSearchResult[]
  unknown: CategorizedSearchResult[]
  totalResults: number
}

// Search cache entry
interface SearchCacheEntry {
  query: string
  results: CategorizedSearchResults
  timestamp: number
  expiresAt: number
}

// Search service configuration
interface SearchConfig {
  cacheExpirationMs: number
  maxCacheSize: number
  relevanceThreshold: number
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  cacheExpirationMs: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 100, // Maximum number of cached searches
  relevanceThreshold: 0.1 // Minimum relevance score to include in results
}

export class SearchService {
  private scraperManager: ScraperManager
  private searchCache: Map<string, SearchCacheEntry> = new Map()
  private config: SearchConfig

  constructor(scraperManager: ScraperManager, config: Partial<SearchConfig> = {}) {
    this.scraperManager = scraperManager
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config }
  }

  /**
   * Search for manga series with categorization and caching
   */
  public async searchSeries(query: string): Promise<CategorizedSearchResults> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty')
    }

    const normalizedQuery = this.normalizeQuery(query)
    
    // Check cache first
    const cachedResult = this.getCachedResult(normalizedQuery)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // Perform search using scraper manager
      const rawResults = await this.scraperManager.searchSeries(query)
      
      // Process and categorize results
      const categorizedResults = this.categorizeAndScoreResults(rawResults, query)
      
      // Filter by relevance threshold
      const filteredResults = this.filterByRelevance(categorizedResults)
      
      // Cache the results
      this.cacheResults(normalizedQuery, filteredResults)
      
      return filteredResults
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw new Error(`Search failed: ${error.message}`)
      }
      throw new Error(`Unexpected error during search: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get trending content with categorization
   */
  public async getTrendingContent(): Promise<{
    hotSeries: CategorizedSearchResults
    latestReleases: CategorizedSearchResults
    mostViewed: CategorizedSearchResults
  }> {
    try {
      const trending = await this.scraperManager.getTrendingContent()
      
      return {
        hotSeries: this.categorizeResults(trending.hotSeries),
        latestReleases: this.categorizeResults(trending.latestReleases),
        mostViewed: this.categorizeResults(trending.mostViewed)
      }
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw new Error(`Failed to get trending content: ${error.message}`)
      }
      throw new Error(`Unexpected error getting trending content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.searchCache.size,
      maxSize: this.config.maxCacheSize
    }
  }

  /**
   * Normalize search query for consistent caching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  /**
   * Get cached search result if available and not expired
   */
  private getCachedResult(normalizedQuery: string): CategorizedSearchResults | null {
    const cached = this.searchCache.get(normalizedQuery)
    
    if (!cached) {
      return null
    }

    // Check if cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.searchCache.delete(normalizedQuery)
      return null
    }

    return cached.results
  }

  /**
   * Cache search results with expiration
   */
  private cacheResults(normalizedQuery: string, results: CategorizedSearchResults): void {
    // Remove oldest entries if cache is full
    if (this.searchCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.searchCache.keys().next().value
      if (oldestKey) {
        this.searchCache.delete(oldestKey)
      }
    }

    const now = Date.now()
    const cacheEntry: SearchCacheEntry = {
      query: normalizedQuery,
      results,
      timestamp: now,
      expiresAt: now + this.config.cacheExpirationMs
    }

    this.searchCache.set(normalizedQuery, cacheEntry)
  }

  /**
   * Categorize and score search results
   */
  private categorizeAndScoreResults(results: SeriesSearchResult[], query: string): CategorizedSearchResults {
    const categorizedResults: CategorizedSearchResults = {
      manga: [],
      manhua: [],
      webtoon: [],
      unknown: [],
      totalResults: results.length
    }

    for (const result of results) {
      const contentType = this.determineContentType(result)
      const relevanceScore = this.calculateRelevanceScore(result, query)
      
      const categorizedResult: CategorizedSearchResult = {
        ...result,
        contentType,
        relevanceScore
      }

      categorizedResults[contentType].push(categorizedResult)
    }

    // Sort each category by relevance score (highest first)
    Object.keys(categorizedResults).forEach(key => {
      if (key !== 'totalResults' && Array.isArray(categorizedResults[key as ContentType])) {
        categorizedResults[key as ContentType].sort((a, b) => b.relevanceScore - a.relevanceScore)
      }
    })

    return categorizedResults
  }

  /**
   * Categorize results without scoring (for trending content)
   */
  private categorizeResults(results: SeriesSearchResult[]): CategorizedSearchResults {
    const categorizedResults: CategorizedSearchResults = {
      manga: [],
      manhua: [],
      webtoon: [],
      unknown: [],
      totalResults: results.length
    }

    for (const result of results) {
      const contentType = this.determineContentType(result)
      const categorizedResult: CategorizedSearchResult = {
        ...result,
        contentType,
        relevanceScore: 1.0 // Default score for trending content
      }

      categorizedResults[contentType].push(categorizedResult)
    }

    return categorizedResults
  }

  /**
   * Determine content type based on series metadata
   */
  private determineContentType(series: SeriesSearchResult): ContentType {
    const title = series.title.toLowerCase()
    const genres = series.genres.map(g => g.toLowerCase())
    const synopsis = series.synopsis.toLowerCase()
    
    // Check for webtoon indicators
    if (
      genres.includes('webtoon') ||
      title.includes('webtoon') ||
      synopsis.includes('webtoon') ||
      genres.includes('manhwa') ||
      title.includes('manhwa')
    ) {
      return 'webtoon'
    }

    // Check for manhua indicators
    if (
      genres.includes('manhua') ||
      title.includes('manhua') ||
      synopsis.includes('manhua') ||
      genres.includes('chinese') ||
      synopsis.includes('chinese')
    ) {
      return 'manhua'
    }

    // Check for manga indicators
    if (
      genres.includes('manga') ||
      title.includes('manga') ||
      synopsis.includes('manga') ||
      genres.includes('japanese') ||
      synopsis.includes('japanese') ||
      genres.includes('shounen') ||
      genres.includes('shoujo') ||
      genres.includes('seinen') ||
      genres.includes('josei')
    ) {
      return 'manga'
    }

    // Default to manga if no specific indicators found
    return 'manga'
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevanceScore(series: SeriesSearchResult, query: string): number {
    const normalizedQuery = query.toLowerCase()
    const queryTerms = normalizedQuery.split(/\s+/)
    
    let score = 0
    const weights = {
      titleExact: 1.0,
      titlePartial: 0.8,
      authorExact: 0.7,
      authorPartial: 0.5,
      genreMatch: 0.4,
      synopsisMatch: 0.3
    }

    const title = series.title.toLowerCase()
    const author = series.author.toLowerCase()
    const genres = series.genres.map(g => g.toLowerCase()).join(' ')
    const synopsis = series.synopsis.toLowerCase()

    // Title matching
    if (title === normalizedQuery) {
      score += weights.titleExact
    } else if (title.includes(normalizedQuery)) {
      score += weights.titlePartial
    } else {
      // Check individual terms
      const titleTermMatches = queryTerms.filter(term => title.includes(term)).length
      score += (titleTermMatches / queryTerms.length) * weights.titlePartial
    }

    // Author matching
    if (author === normalizedQuery) {
      score += weights.authorExact
    } else if (author.includes(normalizedQuery)) {
      score += weights.authorPartial
    } else {
      const authorTermMatches = queryTerms.filter(term => author.includes(term)).length
      score += (authorTermMatches / queryTerms.length) * weights.authorPartial
    }

    // Genre matching
    const genreMatches = queryTerms.filter(term => genres.includes(term)).length
    score += (genreMatches / queryTerms.length) * weights.genreMatch

    // Synopsis matching
    const synopsisMatches = queryTerms.filter(term => synopsis.includes(term)).length
    score += (synopsisMatches / queryTerms.length) * weights.synopsisMatch

    // Normalize score to 0-1 range
    return Math.min(score, 1.0)
  }

  /**
   * Filter results by relevance threshold
   */
  private filterByRelevance(results: CategorizedSearchResults): CategorizedSearchResults {
    const filtered: CategorizedSearchResults = {
      manga: results.manga.filter(r => r.relevanceScore >= this.config.relevanceThreshold),
      manhua: results.manhua.filter(r => r.relevanceScore >= this.config.relevanceThreshold),
      webtoon: results.webtoon.filter(r => r.relevanceScore >= this.config.relevanceThreshold),
      unknown: results.unknown.filter(r => r.relevanceScore >= this.config.relevanceThreshold),
      totalResults: 0
    }

    filtered.totalResults = filtered.manga.length + filtered.manhua.length + 
                           filtered.webtoon.length + filtered.unknown.length

    return filtered
  }
}