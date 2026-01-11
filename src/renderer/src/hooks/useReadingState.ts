import { useState, useEffect, useCallback, useRef } from 'react'
import { ReadingStateService, ReadingState } from '../services/ReadingStateService'
import { ReadingProgress } from '../types'

interface UseReadingStateReturn {
  currentState: ReadingState | null
  isLoading: boolean
  error: string | null
  startSession: (seriesId: string, chapterId: string, initialPage?: number) => Promise<ReadingState | null>
  endSession: () => Promise<void>
  updatePage: (pageNumber: number) => void
  updateZoom: (zoomLevel: number) => void
  updateScrollPosition: (position: { x: number; y: number }) => void
  getLastReadChapter: (seriesId: string) => Promise<ReadingProgress | null>
  getLastReadingPosition: (seriesId: string, chapterId: string) => Promise<ReadingProgress | null>
}

export const useReadingState = (): UseReadingStateReturn => {
  const [currentState, setCurrentState] = useState<ReadingState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const serviceRef = useRef<ReadingStateService | null>(null)

  // Initialize service
  useEffect(() => {
    serviceRef.current = new ReadingStateService()
    
    // Cleanup on unmount
    return () => {
      if (serviceRef.current && currentState) {
        serviceRef.current.endReadingSession()
      }
    }
  }, [])

  // Sync local state with service state
  useEffect(() => {
    if (serviceRef.current) {
      const serviceState = serviceRef.current.getCurrentState()
      setCurrentState(serviceState)
    }
  }, [])

  const startSession = useCallback(async (
    seriesId: string, 
    chapterId: string, 
    initialPage: number = 1
  ): Promise<ReadingState | null> => {
    if (!serviceRef.current) {
      setError('Reading state service not initialized')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const state = await serviceRef.current.startReadingSession(seriesId, chapterId, initialPage)
      setCurrentState(state)
      return state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start reading session'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const endSession = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) return

    setIsLoading(true)
    
    try {
      await serviceRef.current.endReadingSession()
      setCurrentState(null)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end reading session'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePage = useCallback((pageNumber: number): void => {
    if (!serviceRef.current) return

    serviceRef.current.updateReadingState({ pageNumber })
    setCurrentState(serviceRef.current.getCurrentState())
  }, [])

  const updateZoom = useCallback((zoomLevel: number): void => {
    if (!serviceRef.current) return

    serviceRef.current.updateReadingState({ zoomLevel })
    setCurrentState(serviceRef.current.getCurrentState())
  }, [])

  const updateScrollPosition = useCallback((position: { x: number; y: number }): void => {
    if (!serviceRef.current) return

    serviceRef.current.updateReadingState({ scrollPosition: position })
    setCurrentState(serviceRef.current.getCurrentState())
  }, [])

  const getLastReadChapter = useCallback(async (seriesId: string): Promise<ReadingProgress | null> => {
    if (!serviceRef.current) return null

    try {
      return await serviceRef.current.getLastReadChapter(seriesId)
    } catch (err) {
      console.error('Failed to get last read chapter:', err)
      return null
    }
  }, [])

  const getLastReadingPosition = useCallback(async (
    seriesId: string, 
    chapterId: string
  ): Promise<ReadingProgress | null> => {
    if (!serviceRef.current) return null

    try {
      return await serviceRef.current.getLastReadingPosition(seriesId, chapterId)
    } catch (err) {
      console.error('Failed to get last reading position:', err)
      return null
    }
  }, [])

  return {
    currentState,
    isLoading,
    error,
    startSession,
    endSession,
    updatePage,
    updateZoom,
    updateScrollPosition,
    getLastReadChapter,
    getLastReadingPosition
  }
}