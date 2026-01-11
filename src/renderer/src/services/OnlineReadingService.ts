import { Chapter, PageUrl, PageData, ReadingProgress } from '../types'
import { ManhwazScraper } from './ManhwazScraper'
import { StorageService } from './StorageService'

// Cache entry for temporarily stored pages
interface CachedPage {
  pageUrl: string
  imageData: string // Base64 encoded image data
  timestamp: number
  chapterId: string
  pageNumber: number
}

// Online reading configuration
interface OnlineReadingConfig {
  preloadPages: number // Number of pages to preload ahead
  cacheSize: number // Maximum number of pages to cache
  cacheExpiryMs: number // Cache expiry time in milliseconds
  retryAttempts: number // Number of retry attempts for failed requests
  retryDelayMs: number // Delay between retry attempts
}

// Network connectivity status
interface NetworkStatus {
  isOnline: boolean
  lastChecked: Date
  consecutiveFailures: number
}

// Reading session state
interface ReadingSession {
  chapterId: string
  currentPage: number
  totalPages: number
  preloadedPages: Set<number>
  isStreaming: boolean
}

export class OnlineReadingService {
  private manhwazScraper: ManhwazScraper
  private storageService: StorageService
  private pageCache: Map<string, CachedPage> = new Map()
  private config: OnlineReadingConfig
  private networkStatus: NetworkStatus
  private currentSession: ReadingSession | null = null
  private preloadQueue: Set<number> = new Set()
  private isPreloading = false

  constructor(
    manhwazScraper: ManhwazScraper,
    storageService: StorageService,
    config: Partial<OnlineReadingConfig> = {}
  ) {
    this.manhwazScraper = manhwazScraper
    this.storageService = storageService
    this.config = {
      preloadPages: 3,
      cacheSize: 50,
      cacheExpiryMs: 30 * 60 * 1000, // 30 minutes
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config
    }
    this.networkStatus = {
      isOnline: navigator.onLine,
      lastChecked: new Date(),
      consecutiveFailures: 0
    }

    // Listen for network status changes
    window.addEventListener('online', () => this.handleNetworkChange(true))
    window.addEventListener('offline', () => this.handleNetworkChange(false))
  }

  /**
   * Start online reading session for a chapter
   */
  async startOnlineReading(chapterId: string): Promise<PageUrl[]> {
    try {
      await this.checkNetworkConnectivity()
      
      if (!this.networkStatus.isOnline) {
        throw new Error('No internet connection available for online reading')
      }

      // Get chapter pages from scraper
      const pageData = await this.manhwazScraper.getChapterPages(chapterId)
      
      if (!pageData || pageData.length === 0) {
        throw new Error('No pages found for this chapter')
      }

      // Convert PageData[] to PageUrl[] for compatibility
      const pages: PageUrl[] = pageData.map(page => ({
        pageNumber: page.pageNumber,
        imageUrl: page.imageUrl
      }))

      // Initialize reading session
      this.currentSession = {
        chapterId,
        currentPage: 1,
        totalPages: pages.length,
        preloadedPages: new Set(),
        isStreaming: true
      }

      // Start preloading pages
      this.startPreloading(pages)

      return pages
    } catch (error) {
      console.error('Failed to start online reading:', error)
      throw error
    }
  }

  /**
   * Get a specific page with caching and preloading
   */
  async getPage(chapterId: string, pageNumber: number, pageUrl: string): Promise<string> {
    const cacheKey = `${chapterId}-${pageNumber}`
    
    // Check cache first
    const cachedPage = this.pageCache.get(cacheKey)
    if (cachedPage && !this.isCacheExpired(cachedPage)) {
      return cachedPage.imageData
    }

    try {
      await this.checkNetworkConnectivity()
      
      if (!this.networkStatus.isOnline) {
        throw new Error('No internet connection available')
      }

      // Fetch page image
      const imageData = await this.fetchPageImage(pageUrl)
      
      // Cache the page
      this.cachePageImage(chapterId, pageNumber, pageUrl, imageData)
      
      // Reset consecutive failures on success
      this.networkStatus.consecutiveFailures = 0
      
      return imageData
    } catch (error) {
      this.networkStatus.consecutiveFailures++
      console.error(`Failed to get page ${pageNumber}:`, error)
      
      // Return cached version if available, even if expired
      if (cachedPage) {
        console.warn('Using expired cached page due to network error')
        return cachedPage.imageData
      }
      
      throw error
    }
  }

  /**
   * Navigate to a specific page and update preloading
   */
  async navigateToPage(pageNumber: number): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active reading session')
    }

    this.currentSession.currentPage = pageNumber
    
    // Update preloading based on new current page
    if (this.currentSession.isStreaming) {
      await this.updatePreloading()
    }
  }

  /**
   * Get current reading session info
   */
  getCurrentSession(): ReadingSession | null {
    return this.currentSession
  }

  /**
   * Stop current reading session and cleanup
   */
  stopReading(): void {
    if (this.currentSession) {
      this.currentSession.isStreaming = false
      this.currentSession = null
    }
    this.preloadQueue.clear()
    this.isPreloading = false
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.pageCache.size,
      maxSize: this.config.cacheSize
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, cachedPage] of this.pageCache.entries()) {
      if (now - cachedPage.timestamp > this.config.cacheExpiryMs) {
        this.pageCache.delete(key)
      }
    }
  }

  /**
   * Clear all cached pages
   */
  clearCache(): void {
    this.pageCache.clear()
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<void> {
    const now = new Date()
    
    // Update basic online status
    this.networkStatus.isOnline = navigator.onLine
    this.networkStatus.lastChecked = now
    
    // If navigator says we're offline, don't bother with further checks
    if (!navigator.onLine) {
      return
    }

    // In test environment, trust navigator.onLine
    if (process.env.NODE_ENV === 'test') {
      this.networkStatus.isOnline = navigator.onLine
      this.networkStatus.consecutiveFailures = 0
      return
    }

    // Test actual connectivity with a simple request
    try {
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      this.networkStatus.isOnline = true
      this.networkStatus.consecutiveFailures = 0
    } catch (error) {
      this.networkStatus.isOnline = false
      this.networkStatus.consecutiveFailures++
    }
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    this.networkStatus.isOnline = isOnline
    this.networkStatus.lastChecked = new Date()
    
    if (isOnline) {
      this.networkStatus.consecutiveFailures = 0
      // Resume preloading if we have an active session
      if (this.currentSession && this.currentSession.isStreaming) {
        this.updatePreloading()
      }
    } else {
      // Stop preloading when offline
      this.isPreloading = false
      this.preloadQueue.clear()
    }
  }

  /**
   * Start preloading pages around current position
   */
  private async startPreloading(pages: PageUrl[]): Promise<void> {
    if (!this.currentSession || !this.networkStatus.isOnline) {
      return
    }

    // Calculate pages to preload
    const currentPage = this.currentSession.currentPage
    const startPage = Math.max(1, currentPage)
    const endPage = Math.min(pages.length, currentPage + this.config.preloadPages)

    // Add pages to preload queue
    for (let i = startPage; i <= endPage; i++) {
      if (!this.currentSession.preloadedPages.has(i)) {
        this.preloadQueue.add(i)
      }
    }

    // Start preloading process
    this.processPreloadQueue(pages)
  }

  /**
   * Update preloading based on current page
   */
  private async updatePreloading(): Promise<void> {
    if (!this.currentSession || !this.networkStatus.isOnline) {
      return
    }

    try {
      const pageData = await this.manhwazScraper.getChapterPages(this.currentSession.chapterId)
      // Convert PageData[] to PageUrl[] for compatibility
      const pages: PageUrl[] = pageData.map(page => ({
        pageNumber: page.pageNumber,
        imageUrl: page.imageUrl
      }))
      await this.startPreloading(pages)
    } catch (error) {
      console.error('Failed to update preloading:', error)
    }
  }

  /**
   * Process the preload queue
   */
  private async processPreloadQueue(pages: PageUrl[]): Promise<void> {
    if (this.isPreloading || !this.networkStatus.isOnline || !this.currentSession) {
      return
    }

    this.isPreloading = true

    try {
      while (this.preloadQueue.size > 0 && this.currentSession?.isStreaming) {
        const pageNumber = Array.from(this.preloadQueue)[0]
        this.preloadQueue.delete(pageNumber)

        const page = pages[pageNumber - 1]
        if (!page) continue

        try {
          // Check if already cached
          const cacheKey = `${this.currentSession.chapterId}-${pageNumber}`
          if (this.pageCache.has(cacheKey)) {
            this.currentSession.preloadedPages.add(pageNumber)
            continue
          }

          // Preload the page
          await this.getPage(this.currentSession.chapterId, pageNumber, page.imageUrl)
          this.currentSession.preloadedPages.add(pageNumber)

          // Small delay to avoid overwhelming the server
          await this.delay(100)
        } catch (error) {
          console.warn(`Failed to preload page ${pageNumber}:`, error)
          // Continue with other pages even if one fails
        }
      }
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * Fetch page image with retry logic
   */
  private async fetchPageImage(pageUrl: string): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )

        const contentType = response.headers.get('content-type') || 'image/jpeg'
        return `data:${contentType};base64,${base64}`
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt)
        }
      }
    }

    throw lastError || new Error('Failed to fetch page image')
  }

  /**
   * Cache a page image
   */
  private cachePageImage(
    chapterId: string,
    pageNumber: number,
    pageUrl: string,
    imageData: string
  ): void {
    const cacheKey = `${chapterId}-${pageNumber}`
    
    // Remove oldest entries if cache is full
    if (this.pageCache.size >= this.config.cacheSize) {
      const oldestKey = Array.from(this.pageCache.keys())[0]
      this.pageCache.delete(oldestKey)
    }

    this.pageCache.set(cacheKey, {
      pageUrl,
      imageData,
      timestamp: Date.now(),
      chapterId,
      pageNumber
    })
  }

  /**
   * Check if a cached page is expired
   */
  private isCacheExpired(cachedPage: CachedPage): boolean {
    return Date.now() - cachedPage.timestamp > this.config.cacheExpiryMs
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }
}