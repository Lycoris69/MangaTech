import { ScraperManager } from './ScraperManager'
import { ScrapingError } from './WebScrapingService'

// Mock the ManhwazScraper
const mockScraperInstances: any[] = []

jest.mock('./ManhwazScraper', () => ({
  ManhwazScraper: jest.fn().mockImplementation(() => {
    const mockInstance = {
      searchSeries: jest.fn().mockResolvedValue([
        {
          id: 'test-series-1',
          title: 'Test Series 1',
          author: 'Test Author',
          coverImageUrl: 'https://example.com/cover1.jpg',
          synopsis: 'Test synopsis',
          genres: ['Action'],
          status: 'ongoing',
          rating: 4.5,
          sourceUrl: 'https://example.com/series/test-series-1'
        }
      ]),
      getSeriesDetails: jest.fn().mockResolvedValue({
        id: 'test-series-1',
        title: 'Test Series 1',
        author: 'Test Author',
        synopsis: 'Test synopsis',
        coverImageUrl: 'https://example.com/cover1.jpg',
        genres: ['Action'],
        status: 'ongoing',
        rating: 4.5,
        totalChapters: 50,
        lastUpdated: new Date(),
        sourceUrl: 'https://example.com/series/test-series-1'
      }),
      getTrendingContent: jest.fn().mockResolvedValue({
        hotSeries: [
          {
            id: 'hot-1',
            title: 'Hot Series',
            author: 'Popular Author',
            coverImageUrl: 'https://example.com/hot.jpg',
            synopsis: 'Hot series',
            genres: ['Action'],
            status: 'ongoing',
            rating: 4.8,
            sourceUrl: 'https://example.com/series/hot-1'
          }
        ],
        latestReleases: [],
        mostViewed: []
      }),
      getChapterPages: jest.fn().mockResolvedValue([
        { pageNumber: 1, imageUrl: 'https://example.com/page1.jpg' },
        { pageNumber: 2, imageUrl: 'https://example.com/page2.jpg' }
      ]),
      validateSource: jest.fn().mockResolvedValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined)
    }
    
    mockScraperInstances.push(mockInstance)
    return mockInstance
  })
}))

describe('ScraperManager', () => {
  let scraperManager: ScraperManager

  beforeEach(() => {
    // Clear mock instances
    mockScraperInstances.length = 0
    jest.clearAllMocks()
    
    // Use test sources - only ManhwaZ is supported now
    const testSources = [
      {
        name: 'ManhwaZ',
        baseUrl: 'https://manhwaz.com',
        enabled: true,
        priority: 1
      },
      {
        name: 'DisabledSource',
        baseUrl: 'https://disabled.com',
        enabled: false,
        priority: 2
      }
    ]

    scraperManager = new ScraperManager(testSources)
  })

  afterEach(async () => {
    await scraperManager.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with enabled sources only', () => {
      const availableSources = scraperManager.getAvailableSources()
      expect(availableSources).toContain('ManhwaZ')
      expect(availableSources).not.toContain('DisabledSource')
    })

    it('should return list of available sources', () => {
      const sources = scraperManager.getAvailableSources()
      expect(sources).toHaveLength(1)
      expect(sources).toEqual(['ManhwaZ'])
    })
  })

  describe('Search Functionality', () => {
    it('should search using ManhwaZ source and return results', async () => {
      const results = await scraperManager.searchSeries('test query')
      
      expect(results).toHaveLength(1) // One result from ManhwaZ source
      expect(results[0].id).toBe('ManhwaZ:test-series-1')
    })

    it('should handle search failures gracefully', async () => {
      // Mock ManhwaZ source to fail
      if (mockScraperInstances.length >= 1) {
        mockScraperInstances[0].searchSeries.mockRejectedValueOnce(new Error('Search failed'))
      }

      await expect(scraperManager.searchSeries('test query'))
        .rejects.toThrow(ScrapingError)
    })

    it('should throw error when all sources fail', async () => {
      // Mock all sources to fail
      mockScraperInstances.forEach(instance => {
        instance.searchSeries.mockRejectedValue(new Error('All sources failed'))
      })

      await expect(scraperManager.searchSeries('test query'))
        .rejects.toThrow(ScrapingError)
    })

    it('should return search results from ManhwaZ', async () => {
      // Mock ManhwaZ to return results
      if (mockScraperInstances.length >= 1) {
        mockScraperInstances[0].searchSeries.mockResolvedValue([
          {
            id: 'series-1',
            title: 'One Piece',
            author: 'Oda',
            coverImageUrl: 'https://example.com/cover1.jpg',
            synopsis: 'Pirate adventure',
            genres: ['Action'],
            status: 'ongoing',
            rating: 4.9,
            sourceUrl: 'https://manhwaz.com/one-piece'
          }
        ])
      }

      const results = await scraperManager.searchSeries('one piece')
      
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('ManhwaZ:series-1')
    })
  })

  describe('Series Details', () => {
    it('should get series details from ManhwaZ source', async () => {
      const series = await scraperManager.getSeriesDetails('ManhwaZ:test-series-1')
      
      expect(series).toMatchObject({
        id: 'test-series-1',
        title: 'Test Series 1',
        author: 'Test Author'
      })
    })

    it('should throw error for unknown source', async () => {
      await expect(scraperManager.getSeriesDetails('UnknownSource:test-series-1'))
        .rejects.toThrow(ScrapingError)
    })

    it('should handle series ID without source prefix', async () => {
      const series = await scraperManager.getSeriesDetails('test-series-1')
      
      // Should use ManhwaZ as the available source
      expect(series).toMatchObject({
        id: 'test-series-1',
        title: 'Test Series 1'
      })
    })
  })

  describe('Trending Content', () => {
    it('should get trending content from primary source', async () => {
      const trending = await scraperManager.getTrendingContent()
      
      expect(trending).toHaveProperty('hotSeries')
      expect(trending).toHaveProperty('latestReleases')
      expect(trending).toHaveProperty('mostViewed')
      expect(trending.hotSeries[0].id).toBe('ManhwaZ:hot-1')
    })

    it('should throw error when ManhwaZ source fails', async () => {
      // Mock ManhwaZ source to fail
      if (mockScraperInstances.length >= 1) {
        mockScraperInstances[0].getTrendingContent.mockRejectedValueOnce(new Error('ManhwaZ source failed'))
      }

      // Should fail since only one source available
      await expect(scraperManager.getTrendingContent())
        .rejects.toThrow(ScrapingError)
    })
  })

  describe('Chapter Pages', () => {
    it('should get chapter pages from ManhwaZ source', async () => {
      const pages = await scraperManager.getChapterPages('ManhwaZ:chapter-1')
      
      expect(pages).toHaveLength(2)
      expect(pages[0]).toMatchObject({
        pageNumber: 1,
        imageUrl: 'https://example.com/page1.jpg'
      })
    })

    it('should throw error for unknown source', async () => {
      await expect(scraperManager.getChapterPages('UnknownSource:chapter-1'))
        .rejects.toThrow(ScrapingError)
    })
  })

  describe('Source Management', () => {
    it('should throw error when adding unsupported source', () => {
      const newSource = {
        name: 'NewSource',
        baseUrl: 'https://newsource.com',
        enabled: true,
        priority: 4
      }

      expect(() => scraperManager.addSource(newSource))
        .toThrow('Unsupported source: NewSource')
    })

    it('should remove source', async () => {
      scraperManager.removeSource('ManhwaZ')
      
      const sources = scraperManager.getAvailableSources()
      expect(sources).not.toContain('ManhwaZ')
      expect(sources).toHaveLength(0)
    })

    it('should not add disabled source', () => {
      const disabledSource = {
        name: 'DisabledNew',
        baseUrl: 'https://disabled-new.com',
        enabled: false,
        priority: 5
      }

      scraperManager.addSource(disabledSource)
      
      const sources = scraperManager.getAvailableSources()
      expect(sources).not.toContain('DisabledNew')
    })
  })

  describe('Source Validation', () => {
    it('should validate source URLs', async () => {
      const isValid = await scraperManager.validateSource('https://manhwaz.com/some-page')
      expect(isValid).toBe(true)
    })

    it('should return false for unmatched URLs', async () => {
      const isValid = await scraperManager.validateSource('https://unknown.com/page')
      expect(isValid).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup all scrapers', async () => {
      await scraperManager.cleanup()
      
      // Verify cleanup was called on mock scrapers
      mockScraperInstances.forEach(instance => {
        expect(instance.cleanup).toHaveBeenCalled()
      })
    })
  })
})