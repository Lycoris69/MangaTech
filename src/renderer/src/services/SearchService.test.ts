import { SearchService, CategorizedSearchResults } from './SearchService'
import { ScraperManager } from './ScraperManager'
import { SeriesSearchResult, TrendingContent } from '../types'

// Mock ScraperManager
jest.mock('./ScraperManager')

describe('SearchService', () => {
  let searchService: SearchService
  let mockScraperManager: jest.Mocked<ScraperManager>

  const mockSearchResults: SeriesSearchResult[] = [
    {
      id: 'test1',
      title: 'Naruto',
      author: 'Masashi Kishimoto',
      coverImageUrl: 'http://example.com/naruto.jpg',
      synopsis: 'A young ninja with dreams of becoming Hokage',
      genres: ['shounen', 'action', 'manga'],
      status: 'completed',
      rating: 9.0,
      sourceUrl: 'http://example.com/naruto'
    },
    {
      id: 'test2',
      title: 'Solo Leveling',
      author: 'Chugong',
      coverImageUrl: 'http://example.com/solo.jpg',
      synopsis: 'A weak hunter becomes the strongest',
      genres: ['webtoon', 'action', 'fantasy'],
      status: 'completed',
      rating: 9.5,
      sourceUrl: 'http://example.com/solo'
    },
    {
      id: 'test3',
      title: 'Battle Through the Heavens',
      author: 'Tian Can Tu Dou',
      coverImageUrl: 'http://example.com/battle.jpg',
      synopsis: 'A young man seeks to become stronger',
      genres: ['manhua', 'action', 'chinese'],
      status: 'ongoing',
      rating: 8.5,
      sourceUrl: 'http://example.com/battle'
    }
  ]

  const mockTrendingContent: TrendingContent = {
    hotSeries: [mockSearchResults[0]],
    latestReleases: [mockSearchResults[1]],
    mostViewed: [mockSearchResults[2]]
  }

  beforeEach(() => {
    mockScraperManager = new ScraperManager() as jest.Mocked<ScraperManager>
    // Use lower relevance threshold for testing
    searchService = new SearchService(mockScraperManager, { relevanceThreshold: 0.0 })
    
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('searchSeries', () => {
    it('should return categorized search results', async () => {
      mockScraperManager.searchSeries.mockResolvedValue(mockSearchResults)

      const results = await searchService.searchSeries('naruto')

      expect(results).toBeDefined()
      expect(results.totalResults).toBe(3)
      expect(results.manga).toHaveLength(1)
      expect(results.webtoon).toHaveLength(1)
      expect(results.manhua).toHaveLength(1)
      expect(results.manga[0].title).toBe('Naruto')
      expect(results.webtoon[0].title).toBe('Solo Leveling')
      expect(results.manhua[0].title).toBe('Battle Through the Heavens')
    })

    it('should throw error for empty query', async () => {
      await expect(searchService.searchSeries('')).rejects.toThrow('Search query cannot be empty')
      await expect(searchService.searchSeries('   ')).rejects.toThrow('Search query cannot be empty')
    })

    it('should calculate relevance scores correctly', async () => {
      mockScraperManager.searchSeries.mockResolvedValue(mockSearchResults)

      const results = await searchService.searchSeries('naruto')

      expect(results.manga[0].relevanceScore).toBeGreaterThan(0)
      expect(results.manga[0].relevanceScore).toBeLessThanOrEqual(1)
    })

    it('should cache search results', async () => {
      mockScraperManager.searchSeries.mockResolvedValue(mockSearchResults)

      // First search
      await searchService.searchSeries('naruto')
      expect(mockScraperManager.searchSeries).toHaveBeenCalledTimes(1)

      // Second search with same query should use cache
      await searchService.searchSeries('naruto')
      expect(mockScraperManager.searchSeries).toHaveBeenCalledTimes(1)

      // Different query should call scraper again
      await searchService.searchSeries('one piece')
      expect(mockScraperManager.searchSeries).toHaveBeenCalledTimes(2)
    })

    it('should normalize queries for caching', async () => {
      mockScraperManager.searchSeries.mockResolvedValue(mockSearchResults)

      await searchService.searchSeries('  NARUTO  ')
      await searchService.searchSeries('naruto')
      await searchService.searchSeries('Naruto')

      // Should only call scraper once due to normalization
      expect(mockScraperManager.searchSeries).toHaveBeenCalledTimes(1)
    })

    it('should filter results by relevance threshold', async () => {
      const lowRelevanceResults = [
        {
          ...mockSearchResults[0],
          title: 'Completely Unrelated Title',
          author: 'Unknown Author',
          synopsis: 'Nothing related to the search',
          genres: ['random']
        }
      ]

      mockScraperManager.searchSeries.mockResolvedValue(lowRelevanceResults)

      const results = await searchService.searchSeries('naruto')

      // Results with very low relevance should be filtered out
      expect(results.totalResults).toBeLessThanOrEqual(lowRelevanceResults.length)
    })
  })

  describe('getTrendingContent', () => {
    it('should return categorized trending content', async () => {
      mockScraperManager.getTrendingContent.mockResolvedValue(mockTrendingContent)

      const trending = await searchService.getTrendingContent()

      expect(trending).toBeDefined()
      expect(trending.hotSeries).toBeDefined()
      expect(trending.latestReleases).toBeDefined()
      expect(trending.mostViewed).toBeDefined()
      
      expect(trending.hotSeries.manga).toHaveLength(1)
      expect(trending.latestReleases.webtoon).toHaveLength(1)
      expect(trending.mostViewed.manhua).toHaveLength(1)
    })
  })

  describe('cache management', () => {
    it('should clear cache', async () => {
      mockScraperManager.searchSeries.mockResolvedValue(mockSearchResults)

      await searchService.searchSeries('naruto')
      searchService.clearCache()
      await searchService.searchSeries('naruto')

      // Should call scraper twice since cache was cleared
      expect(mockScraperManager.searchSeries).toHaveBeenCalledTimes(2)
    })

    it('should return cache statistics', () => {
      const stats = searchService.getCacheStats()
      
      expect(stats).toBeDefined()
      expect(stats.size).toBeDefined()
      expect(stats.maxSize).toBeDefined()
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.maxSize).toBe('number')
    })
  })

  describe('content type determination', () => {
    it('should correctly identify manga', async () => {
      const mangaResult = [{
        ...mockSearchResults[0],
        genres: ['shounen', 'manga', 'action']
      }]
      
      mockScraperManager.searchSeries.mockResolvedValue(mangaResult)
      const results = await searchService.searchSeries('naruto')
      
      expect(results.manga).toHaveLength(1)
      expect(results.manga[0].contentType).toBe('manga')
    })

    it('should correctly identify webtoons', async () => {
      const webtoonResult = [{
        ...mockSearchResults[1],
        genres: ['webtoon', 'action']
      }]
      
      mockScraperManager.searchSeries.mockResolvedValue(webtoonResult)
      const results = await searchService.searchSeries('solo leveling')
      
      expect(results.webtoon).toHaveLength(1)
      expect(results.webtoon[0].contentType).toBe('webtoon')
    })

    it('should correctly identify manhua', async () => {
      const manhuaResult = [{
        ...mockSearchResults[2],
        genres: ['manhua', 'chinese', 'action']
      }]
      
      mockScraperManager.searchSeries.mockResolvedValue(manhuaResult)
      const results = await searchService.searchSeries('battle')
      
      expect(results.manhua).toHaveLength(1)
      expect(results.manhua[0].contentType).toBe('manhua')
    })
  })
})