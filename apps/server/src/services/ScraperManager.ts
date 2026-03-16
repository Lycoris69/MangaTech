import { WebScrapingService, ScrapingError } from './WebScrapingService.js'
import { ManhwazScraper } from './ManhwazScraper.js'
import { Series, SeriesSearchResult, TrendingContent, PageUrl } from '../types/index.js'

// Configuration for manga sources
interface SourceConfig {
  name: string
  baseUrl: string
  enabled: boolean
  priority: number // Higher priority sources are tried first
}

// Default source configurations
const DEFAULT_SOURCES: SourceConfig[] = [
  {
    name: 'ManhwaZ',
    baseUrl: 'https://manhwaz.com',
    enabled: true,
    priority: 1 // Highest priority - specialized manhwaz.com scraper
  }
  // Additional sources can be added here as needed
]

// Scraper manager that handles multiple manga sources
export class ScraperManager {
  private scrapers: Map<string, WebScrapingService> = new Map()
  private sources: SourceConfig[]
  private logDirectory: string

  constructor(sources: SourceConfig[] = DEFAULT_SOURCES, logDirectory: string = 'logs') {
    this.sources = sources.sort((a, b) => a.priority - b.priority)
    this.logDirectory = logDirectory
    this.initializeScrapers()
  }

  // Initialize scrapers for all enabled sources
  private initializeScrapers(): void {
    this.sources
      .filter(source => source.enabled)
      .forEach(source => {
        try {
          let scraper: WebScrapingService

          // Use specialized scraper for ManhwaZ
          if (source.name === 'ManhwaZ') {
            scraper = new ManhwazScraper(this.logDirectory)
          } else {
            throw new Error(`Unsupported source: ${source.name}`)
          }

          this.scrapers.set(source.name, scraper)
        } catch (error) {
          console.error(`Failed to initialize scraper for ${source.name}:`, error)
        }
      })
  }

  // Get list of available sources
  public getAvailableSources(): string[] {
    return Array.from(this.scrapers.keys())
  }

  // Search across all available sources
  public async searchSeries(query: string): Promise<SeriesSearchResult[]> {
    const results: SeriesSearchResult[] = []
    const errors: Error[] = []

    // Try each scraper in priority order
    for (const [sourceName, scraper] of this.scrapers) {
      try {
        const sourceResults = await scraper.searchSeries(query)

        // Add source information to results
        const enrichedResults = sourceResults.map(result => ({
          ...result,
          id: `${sourceName}:${result.id}`, // Prefix with source name
          sourceUrl: result.sourceUrl
        }))

        results.push(...enrichedResults)
      } catch (error) {
        console.error(`Search failed for source ${sourceName}:`, error)
        errors.push(error instanceof Error ? error : new Error(`Unknown error from ${sourceName}`))
      }
    }

    // If no results from any source, throw aggregated error
    if (results.length === 0 && errors.length > 0) {
      throw new ScrapingError(
        `Search failed across all sources: ${errors.map(e => e.message).join('; ')}`
      )
    }

    // Remove duplicates based on title similarity
    return this.deduplicateResults(results)
  }

  // Get series details from specific source
  public async getSeriesDetails(seriesId: string): Promise<Series> {
    const [sourceName, actualId] = this.parseSeriesId(seriesId)
    const scraper = this.scrapers.get(sourceName)

    if (!scraper) {
      throw new ScrapingError(`Source ${sourceName} not available`)
    }

    try {
      console.log(`[ScraperManager] Fetching details for actualId: ${actualId} from source: ${sourceName}`);
      return await scraper.getSeriesDetails(actualId);
    } catch (error) {
      console.error(`[ScraperManager] Failed for ${actualId}:`, error);
      throw new ScrapingError(
        `Failed to get series details from ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Get trending content from primary source
  public async getTrendingContent(): Promise<TrendingContent> {
    const errors: Error[] = []

    // Try sources in priority order
    for (const [sourceName, scraper] of this.scrapers) {
      try {
        const trending = await scraper.getTrendingContent()

        // Enrich results with source information
        const enrichTrendingSection = (series: SeriesSearchResult[]) =>
          series.map(s => ({
            ...s,
            id: `${sourceName}:${s.id}`
          }))

        return {
          hotSeries: enrichTrendingSection(trending.hotSeries),
          latestReleases: enrichTrendingSection(trending.latestReleases),
          mostViewed: enrichTrendingSection(trending.mostViewed)
        }
      } catch (error) {
        console.error(`Failed to get trending content from ${sourceName}:`, error)
        errors.push(error instanceof Error ? error : new Error(`Unknown error from ${sourceName}`))
      }
    }

    throw new ScrapingError(
      `Failed to get trending content from all sources: ${errors.map(e => e.message).join('; ')}`
    )
  }

  // Get latest releases from primary source
  public async getLatestReleases(page: number = 1): Promise<SeriesSearchResult[]> {
    const errors: Error[] = []

    // Try sources in priority order
    for (const [sourceName, scraper] of this.scrapers) {
      try {
        const releases = await scraper.getLatestReleases(page)

        // Enrich results with source information
        return releases.map(s => ({
          ...s,
          id: `${sourceName}:${s.id}`
        }))
      } catch (error) {
        console.error(`Failed to get latest releases from ${sourceName}:`, error)
        errors.push(error instanceof Error ? error : new Error(`Unknown error from ${sourceName}`))
      }
    }

    throw new ScrapingError(
      `Failed to get latest releases from all sources: ${errors.map(e => e.message).join('; ')}`
    )
  }

  // Get chapter pages from specific source
  public async getChapterPages(chapterId: string): Promise<PageUrl[]> {
    const [sourceName, actualId] = this.parseSeriesId(chapterId)
    const scraper = this.scrapers.get(sourceName)

    if (!scraper) {
      throw new ScrapingError(`Source ${sourceName} not available`)
    }

    try {
      return await scraper.getChapterPages(actualId)
    } catch (error) {
      throw new ScrapingError(
        `Failed to get chapter pages from ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Invalidate cache in specific source
  public async invalidateCache(id: string, type: 'series' | 'chapter' | 'search' = 'chapter'): Promise<void> {
    const [sourceName, actualId] = this.parseSeriesId(id)
    const scraper = this.scrapers.get(sourceName)

    if (scraper) {
      await scraper.invalidateCache(type, actualId)
    }
  }

  // Validate source availability
  public async validateSource(sourceUrl: string): Promise<boolean> {
    // Find scraper by matching base URL
    for (const [sourceName, scraper] of this.scrapers) {
      const source = this.sources.find(s => s.name === sourceName)
      if (source && sourceUrl.startsWith(source.baseUrl)) {
        try {
          return await scraper.validateSource(sourceUrl)
        } catch (error) {
          console.error(`Source validation failed for ${sourceName}:`, error)
          return false
        }
      }
    }

    return false
  }

  // Parse series ID to extract source name and actual ID
  private parseSeriesId(seriesId: string): [string, string] {
    // If it's a full URL, try to match it with a source base URL
    if (seriesId.startsWith('http')) {
      for (const [sourceName, _scraper] of this.scrapers) {
        const source = this.sources.find(s => s.name === sourceName)
        if (source && (seriesId.startsWith(source.baseUrl) || seriesId.includes(source.baseUrl.replace('https://', '')))) {
          return [sourceName, seriesId]
        }
      }
    }

    const parts = seriesId.split(':')
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(':')]
    }

    // If no source prefix, use first available source
    const firstSource = this.scrapers.keys().next().value
    if (firstSource) {
      return [firstSource, seriesId]
    }

    throw new ScrapingError('No sources available')
  }

  // Remove duplicate results based on title similarity
  private deduplicateResults(results: SeriesSearchResult[]): SeriesSearchResult[] {
    const seen = new Set<string>()
    const deduplicated: SeriesSearchResult[] = []

    for (const result of results) {
      const normalizedTitle = result.title.toLowerCase().replace(/[^\w\s]/g, '').trim()

      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle)
        deduplicated.push(result)
      }
    }

    return deduplicated
  }

  // Add a new source
  public addSource(config: SourceConfig): void {
    if (config.enabled) {
      try {
        let scraper: WebScrapingService

        // Use specialized scraper for ManhwaZ
        if (config.name === 'ManhwaZ') {
          scraper = new ManhwazScraper()
        } else {
          throw new Error(`Unsupported source: ${config.name}`)
        }

        this.scrapers.set(config.name, scraper)
        this.sources.push(config)
        this.sources.sort((a, b) => a.priority - b.priority)
      } catch (error) {
        console.error(`Failed to add source ${config.name}:`, error)
        throw new ScrapingError(`Failed to add source: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  public removeSource(sourceName: string): void {
    const scraper = this.scrapers.get(sourceName)
    if (scraper && 'cleanup' in scraper && typeof scraper.cleanup === 'function') {
      (scraper as { cleanup: () => Promise<void> }).cleanup().catch((error: unknown) => {
        console.error(`Failed to cleanup scraper for ${sourceName}:`, error)
      })
    }

    this.scrapers.delete(sourceName)
    this.sources = this.sources.filter(s => s.name !== sourceName)
  }

  // Clean up all scrapers
  public async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = []

    for (const [sourceName, scraper] of this.scrapers) {
      if ('cleanup' in scraper && typeof scraper.cleanup === 'function') {
        cleanupPromises.push(
          (scraper as { cleanup: () => Promise<void> }).cleanup().catch((error: unknown) => {
            console.error(`Failed to cleanup scraper for ${sourceName}:`, error)
          })
        )
      }
    }

    await Promise.all(cleanupPromises)
    this.scrapers.clear()
  }
}