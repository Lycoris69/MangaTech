import { useState, useEffect, useCallback, useRef } from 'react'
import { OnlineReadingService } from '../services/OnlineReadingService'
import { ManhwazScraper } from '../services/ManhwazScraper'
import { StorageService } from '../services/StorageService'
import { PageUrl } from '../types'

interface OnlineReadingState {
  isLoading: boolean
  isStreaming: boolean
  currentPage: number
  totalPages: number
  pages: PageUrl[]
  error: string | null
  networkStatus: {
    isOnline: boolean
    consecutiveFailures: number
  }
  cacheStats: {
    size: number
    maxSize: number
  }
}

interface UseOnlineReadingReturn {
  state: OnlineReadingState
  startReading: (chapterId: string) => Promise<void>
  stopReading: () => void
  navigateToPage: (pageNumber: number) => Promise<void>
  getPageImage: (pageNumber: number) => Promise<string>
  clearCache: () => void
  retryConnection: () => Promise<void>
}

export const useOnlineReading = (): UseOnlineReadingReturn => {
  const [state, setState] = useState<OnlineReadingState>({
    isLoading: false,
    isStreaming: false,
    currentPage: 1,
    totalPages: 0,
    pages: [],
    error: null,
    networkStatus: {
      isOnline: navigator.onLine,
      consecutiveFailures: 0
    },
    cacheStats: {
      size: 0,
      maxSize: 50
    }
  })

  const serviceRef = useRef<OnlineReadingService | null>(null)
  const manhwazScraperRef = useRef<ManhwazScraper | null>(null)
  const storageServiceRef = useRef<StorageService | null>(null)

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        manhwazScraperRef.current = new ManhwazScraper()
        storageServiceRef.current = new StorageService()
        await storageServiceRef.current.initialize()
        
        serviceRef.current = new OnlineReadingService(
          manhwazScraperRef.current,
          storageServiceRef.current
        )
      } catch (error) {
        console.error('Failed to initialize online reading services:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize reading services'
        }))
      }
    }

    initializeServices()

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopReading()
      }
    }
  }, [])

  // Update network status periodically
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (serviceRef.current) {
        const networkStatus = serviceRef.current.getNetworkStatus()
        const cacheStats = serviceRef.current.getCacheStats()
        
        setState(prev => ({
          ...prev,
          networkStatus: {
            isOnline: networkStatus.isOnline,
            consecutiveFailures: networkStatus.consecutiveFailures
          },
          cacheStats
        }))
      }
    }

    const interval = setInterval(updateNetworkStatus, 5000) // Update every 5 seconds
    updateNetworkStatus() // Initial update

    return () => clearInterval(interval)
  }, [])

  const startReading = useCallback(async (chapterId: string) => {
    if (!serviceRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Reading service not initialized'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      const pages = await serviceRef.current.startOnlineReading(chapterId)
      const session = serviceRef.current.getCurrentSession()

      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: true,
        pages,
        totalPages: pages.length,
        currentPage: session?.currentPage || 1,
        error: null
      }))
    } catch (error) {
      console.error('Failed to start online reading:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to start reading'
      }))
    }
  }, [])

  const stopReading = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopReading()
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentPage: 1,
      totalPages: 0,
      pages: [],
      error: null
    }))
  }, [])

  const navigateToPage = useCallback(async (pageNumber: number) => {
    if (!serviceRef.current) {
      return
    }

    try {
      await serviceRef.current.navigateToPage(pageNumber)
      setState(prev => ({
        ...prev,
        currentPage: pageNumber,
        error: null
      }))
    } catch (error) {
      console.error('Failed to navigate to page:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to navigate'
      }))
    }
  }, [])

  const getPageImage = useCallback(async (pageNumber: number): Promise<string> => {
    if (!serviceRef.current || !state.pages[pageNumber - 1]) {
      throw new Error('Page not available')
    }

    const page = state.pages[pageNumber - 1]
    const session = serviceRef.current.getCurrentSession()
    
    if (!session) {
      throw new Error('No active reading session')
    }

    try {
      const imageData = await serviceRef.current.getPage(
        session.chapterId,
        pageNumber,
        page.imageUrl
      )
      
      // Update cache stats after successful fetch
      const cacheStats = serviceRef.current.getCacheStats()
      setState(prev => ({
        ...prev,
        cacheStats,
        error: null
      }))
      
      return imageData
    } catch (error) {
      console.error(`Failed to get page ${pageNumber}:`, error)
      
      // Update network status on error
      const networkStatus = serviceRef.current.getNetworkStatus()
      setState(prev => ({
        ...prev,
        networkStatus: {
          isOnline: networkStatus.isOnline,
          consecutiveFailures: networkStatus.consecutiveFailures
        },
        error: error instanceof Error ? error.message : 'Failed to load page'
      }))
      
      throw error
    }
  }, [state.pages])

  const clearCache = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearCache()
      const cacheStats = serviceRef.current.getCacheStats()
      setState(prev => ({
        ...prev,
        cacheStats
      }))
    }
  }, [])

  const retryConnection = useCallback(async () => {
    if (!serviceRef.current) {
      return
    }

    setState(prev => ({
      ...prev,
      error: null
    }))

    // Force a network check by trying to get current page
    try {
      if (state.currentPage > 0 && state.pages.length > 0) {
        await getPageImage(state.currentPage)
      }
    } catch (error) {
      // Error will be handled by getPageImage
    }
  }, [state.currentPage, state.pages.length, getPageImage])

  return {
    state,
    startReading,
    stopReading,
    navigateToPage,
    getPageImage,
    clearCache,
    retryConnection
  }
}