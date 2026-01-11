import { ReadingProgress } from '../types'
import { LibraryService } from './LibraryService'

export interface ReadingState {
  seriesId: string
  chapterId: string
  pageNumber: number
  zoomLevel: number
  scrollPosition?: { x: number; y: number }
  timestamp: Date
}

export class ReadingStateService {
  private libraryService: LibraryService
  private currentState: ReadingState | null = null
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor() {
    this.libraryService = new LibraryService()
  }

  /**
   * Start tracking reading state for a chapter
   */
  async startReadingSession(seriesId: string, chapterId: string, initialPage: number = 1): Promise<ReadingState> {
    // Try to restore previous state for this chapter
    const savedProgress = await this.libraryService.getReadingProgress(seriesId)
    const chapterProgress = savedProgress.find(p => p.chapterId === chapterId)

    this.currentState = {
      seriesId,
      chapterId,
      pageNumber: chapterProgress?.pageNumber || initialPage,
      zoomLevel: 1,
      timestamp: new Date()
    }

    // Start auto-save every 5 seconds
    this.startAutoSave()

    return this.currentState
  }

  /**
   * Update current reading state
   */
  updateReadingState(updates: Partial<Omit<ReadingState, 'seriesId' | 'chapterId' | 'timestamp'>>): void {
    if (!this.currentState) return

    this.currentState = {
      ...this.currentState,
      ...updates,
      timestamp: new Date()
    }
  }

  /**
   * Get current reading state
   */
  getCurrentState(): ReadingState | null {
    return this.currentState
  }

  /**
   * Save current reading state to persistent storage
   */
  async saveReadingState(): Promise<void> {
    if (!this.currentState) return

    try {
      await this.libraryService.markAsRead(
        this.currentState.seriesId,
        this.currentState.chapterId,
        this.currentState.pageNumber
      )
    } catch (error) {
      console.error('Failed to save reading state:', error)
    }
  }

  /**
   * End reading session and save final state
   */
  async endReadingSession(): Promise<void> {
    if (this.currentState) {
      await this.saveReadingState()
      this.stopAutoSave()
      this.currentState = null
    }
  }

  /**
   * Get last reading position for a chapter
   */
  async getLastReadingPosition(seriesId: string, chapterId: string): Promise<ReadingProgress | null> {
    try {
      const progress = await this.libraryService.getReadingProgress(seriesId)
      return progress.find(p => p.chapterId === chapterId) || null
    } catch (error) {
      console.error('Failed to get last reading position:', error)
      return null
    }
  }

  /**
   * Get last read chapter for a series
   */
  async getLastReadChapter(seriesId: string): Promise<ReadingProgress | null> {
    try {
      return await this.libraryService.getLastReadChapter(seriesId)
    } catch (error) {
      console.error('Failed to get last read chapter:', error)
      return null
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.stopAutoSave() // Clear any existing timer
    
    this.autoSaveInterval = setInterval(async () => {
      await this.saveReadingState()
    }, 5000) // Save every 5 seconds
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }
}