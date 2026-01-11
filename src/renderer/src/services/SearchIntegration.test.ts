/**
 * Integration tests for Search functionality
 * Tests the integration between ManhwazScraper and SearchInterface
 */

describe('Search Integration', () => {
  // Mock all external dependencies
  beforeAll(() => {
    jest.doMock('winston', () => ({
      createLogger: jest.fn(() => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      })),
      format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
        simple: jest.fn()
      },
      transports: {
        Console: jest.fn()
      }
    }))

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: '<html><body><div class="search-results"></div></body></html>'
        }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      }))
    }))

    jest.doMock('cheerio', () => ({
      load: jest.fn(() => {
        const mockElement = {
          length: 0,
          each: jest.fn(),
          first: jest.fn(() => ({
            text: jest.fn(() => ''),
            attr: jest.fn(() => ''),
            find: jest.fn(() => mockElement)
          })),
          text: jest.fn(() => ''),
          attr: jest.fn(() => ''),
          find: jest.fn(() => mockElement)
        }
        
        const mockCheerio = Object.assign(jest.fn(() => mockElement), mockElement)
        return mockCheerio
      })
    }))

    jest.doMock('puppeteer', () => ({}))
  })

  it('should integrate search functionality with ManhwazScraper', async () => {
    // Dynamic import after mocking
    const { ManhwazScraper } = await import('./ManhwazScraper')
    
    const scraper = new ManhwazScraper()
    
    // Test that search methods exist and are callable
    expect(typeof scraper.searchSeries).toBe('function')
    expect(typeof scraper.searchSeriesWithDetails).toBe('function')
    expect(typeof scraper.getAutocompleteSuggestions).toBe('function')
    
    // Test that SearchInterface is accessible
    const searchInterface = scraper.getSearchInterface()
    expect(searchInterface).toBeDefined()
    expect(typeof searchInterface.searchSeries).toBe('function')
    expect(typeof searchInterface.getAutocompleteSuggestions).toBe('function')
    expect(typeof searchInterface.generateEmptyResultsMessage).toBe('function')
  })

  it('should handle empty search queries appropriately', async () => {
    const { ManhwazScraper } = await import('./ManhwazScraper')
    
    const scraper = new ManhwazScraper()
    
    // Test empty query validation
    await expect(scraper.searchSeries('')).rejects.toThrow('Search query cannot be empty')
    await expect(scraper.searchSeriesWithDetails('   ')).rejects.toThrow('Search query cannot be empty')
    
    // Test autocomplete with short queries
    const suggestions = await scraper.getAutocompleteSuggestions('')
    expect(Array.isArray(suggestions)).toBe(true)
    expect(suggestions.length).toBe(0)
  })

  it('should provide search interface components', async () => {
    const { SearchInterface } = await import('./SearchInterface')
    
    // Test that SearchInterface can be instantiated with mocked dependencies
    const mockURLManager = {
      buildSearchUrl: jest.fn(() => 'https://manhwaz.com/search?s=test'),
      getBaseUrl: jest.fn(() => 'https://manhwaz.com'),
      resolveUrl: jest.fn((url: string) => url),
      validateUrl: jest.fn(() => true),
      extractSeriesId: jest.fn(() => 'test-id')
    }
    
    const mockRateLimiter = {
      acquireToken: jest.fn().mockResolvedValue(true)
    }
    
    const mockContentValidator = {
      validateSearchResult: jest.fn(() => ({ isValid: true, errors: [], warnings: [] }))
    }
    
    const searchInterface = new SearchInterface(
      mockURLManager as any,
      mockRateLimiter as any,
      mockContentValidator as any
    )
    
    // Test empty results message generation
    const message = searchInterface.generateEmptyResultsMessage('test', [])
    expect(message).toContain('No results found for "test"')
    expect(message).toContain('Try using different keywords')
  })
})