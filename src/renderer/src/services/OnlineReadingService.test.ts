import { OnlineReadingService } from './OnlineReadingService'
import { ScraperManager } from './ScraperManager'
import { StorageService } from './StorageService'
import { PageUrl } from '../types'

// Mock the dependencies
jest.mock('./ScraperManager')
jest.mock('./StorageService')

// Mock fetch globally
global.fetch = jest.fn()

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window.addEventListener
const mockAddEventListener = jest.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})

describe('OnlineReadingService', () => {
  let service: OnlineReadingService
  let mockScraperManager: jest.Mocked<ScraperManager>
  let mockStorageService: jest.Mocked<StorageService>

  const mockPages: PageUrl[] = [
    { pageNumber: 1, imageUrl: 'https://example.com/page1.jpg' },
    { pageNumber: 2, imageUrl: 'https://example.com/page2.jpg' },
    { pageNumber: 3, imageUrl: 'https://example.com/page3.jpg' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset navigator.onLine to true for each test
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    
    mockScraperManager = new ScraperManager() as jest.Mocked<ScraperManager>
    mockStorageService = new StorageService() as jest.Mocked<StorageService>
    
    mockScraperManager.getChapterPages.mockResolvedValue(mockPages)
    
    service = new OnlineReadingService(mockScraperManager, mockStorageService, {
      preloadPages: 0, // Disable preloading for tests
      cacheSize: 10,
      cacheExpiryMs: 60000,
      retryAttempts: 2,
      retryDelayMs: 100
    })

    // Mock fetch to return a simple image
    const mockArrayBuffer = new ArrayBuffer(8)
    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      headers: new Map([['content-type', 'image/jpeg']])
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    service.stopReading()
  })

  describe('startOnlineReading', () => {
    it('should start reading session successfully', async () => {
      const pages = await service.startOnlineReading('chapter-1')
      
      expect(pages).toEqual(mockPages)
      expect(mockScraperManager.getChapterPages).toHaveBeenCalledWith('chapter-1')
      
      const session = service.getCurrentSession()
      expect(session).toMatchObject({
        chapterId: 'chapter-1',
        currentPage: 1,
        totalPages: 3,
        isStreaming: true
      })
    })

    it('should throw error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      await expect(service.startOnlineReading('chapter-1')).rejects.toThrow(
        'No internet connection available for online reading'
      )
    })

    it('should throw error when no pages found', async () => {
      mockScraperManager.getChapterPages.mockResolvedValue([])
      
      await expect(service.startOnlineReading('chapter-1')).rejects.toThrow(
        'No pages found for this chapter'
      )
    })
  })

  describe('getPage', () => {
    beforeEach(async () => {
      await service.startOnlineReading('chapter-1')
    })

    it('should fetch and cache page successfully', async () => {
      const imageData = await service.getPage('chapter-1', 1, 'https://example.com/page1.jpg')
      
      expect(imageData).toMatch(/^data:image\/jpeg;base64,/)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/page1.jpg',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      )
      
      // Verify caching
      const cacheStats = service.getCacheStats()
      expect(cacheStats.size).toBe(1)
    })

    it('should return cached page on subsequent requests', async () => {
      // First request
      await service.getPage('chapter-1', 1, 'https://example.com/page1.jpg')
      
      // Second request should use cache
      const imageData = await service.getPage('chapter-1', 1, 'https://example.com/page1.jpg')
      
      expect(imageData).toMatch(/^data:image\/jpeg;base64,/)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Should not fetch again
    })

    it('should retry on fetch failure', async () => {
      // Clear cache to ensure fresh fetch
      service.clearCache()
      
      // Reset mock call count
      ;(global.fetch as jest.Mock).mockClear()
      
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: new Map([['content-type', 'image/jpeg']])
        })
      
      const imageData = await service.getPage('chapter-1', 2, 'https://example.com/page2.jpg')
      
      expect(imageData).toMatch(/^data:image\/jpeg;base64,/)
      expect(global.fetch).toHaveBeenCalledTimes(2) // 2 retry attempts total
    })

    it('should throw error after max retries', async () => {
      // Clear cache to ensure fresh fetch
      service.clearCache()
      
      // Reset mock call count
      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      await expect(
        service.getPage('chapter-1', 3, 'https://example.com/page3.jpg')
      ).rejects.toThrow('Network error')
      
      expect(global.fetch).toHaveBeenCalledTimes(2) // 2 retry attempts total
    })

    it('should handle offline mode gracefully', async () => {
      // Clear cache to ensure fresh fetch attempt
      service.clearCache()
      
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      await expect(
        service.getPage('chapter-1', 4, 'https://example.com/page4.jpg')
      ).rejects.toThrow('No internet connection available')
    })
  })

  describe('navigateToPage', () => {
    beforeEach(async () => {
      await service.startOnlineReading('chapter-1')
    })

    it('should update current page', async () => {
      await service.navigateToPage(2)
      
      const session = service.getCurrentSession()
      expect(session?.currentPage).toBe(2)
    })

    it('should throw error without active session', async () => {
      service.stopReading()
      
      await expect(service.navigateToPage(2)).rejects.toThrow(
        'No active reading session'
      )
    })
  })

  describe('cache management', () => {
    beforeEach(async () => {
      await service.startOnlineReading('chapter-1')
    })

    it('should respect cache size limit', async () => {
      // Fill cache beyond limit
      for (let i = 1; i <= 12; i++) {
        await service.getPage('chapter-1', i, `https://example.com/page${i}.jpg`)
      }
      
      const cacheStats = service.getCacheStats()
      expect(cacheStats.size).toBe(10) // Should not exceed maxSize
    })

    it('should clear cache when requested', async () => {
      await service.getPage('chapter-1', 1, 'https://example.com/page1.jpg')
      
      let cacheStats = service.getCacheStats()
      expect(cacheStats.size).toBe(1)
      
      service.clearCache()
      
      cacheStats = service.getCacheStats()
      expect(cacheStats.size).toBe(0)
    })

    it('should clear expired cache entries', async () => {
      // Create service with very short cache expiry
      const shortCacheService = new OnlineReadingService(
        mockScraperManager,
        mockStorageService,
        { cacheExpiryMs: 1 }
      )
      
      await shortCacheService.startOnlineReading('chapter-1')
      await shortCacheService.getPage('chapter-1', 1, 'https://example.com/page1.jpg')
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      shortCacheService.clearExpiredCache()
      
      const cacheStats = shortCacheService.getCacheStats()
      expect(cacheStats.size).toBe(0)
      
      shortCacheService.stopReading()
    })
  })

  describe('network status', () => {
    it('should track network status', () => {
      const status = service.getNetworkStatus()
      
      expect(status).toMatchObject({
        isOnline: true,
        consecutiveFailures: 0
      })
      expect(status.lastChecked).toBeInstanceOf(Date)
    })

    it('should register event listeners for network changes', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('session management', () => {
    it('should return null session when not reading', () => {
      const session = service.getCurrentSession()
      expect(session).toBeNull()
    })

    it('should stop reading and cleanup session', async () => {
      await service.startOnlineReading('chapter-1')
      
      let session = service.getCurrentSession()
      expect(session).not.toBeNull()
      
      service.stopReading()
      
      session = service.getCurrentSession()
      expect(session).toBeNull()
    })
  })
})