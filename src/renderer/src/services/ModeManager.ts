import { LibraryService } from './LibraryService'
import { ReadingStateService, ReadingState } from './ReadingStateService'
import { UserPreferences } from '../types'

export type AppMode = 'navigation' | 'reading'

export interface ModeContext {
  mode: AppMode
  previousMode?: AppMode
  navigationContext?: {
    currentRoute: string
    scrollPosition: number
    searchQuery?: string
    selectedSeries?: string
  }
  readingContext?: {
    seriesId: string
    chapterId: string
    pageNumber: number
    zoomLevel: number
    scrollPosition?: { x: number; y: number }
  }
  timestamp: Date
}

export interface ModeTransition {
  fromMode: AppMode
  toMode: AppMode
  preserveContext: boolean
  animationDuration: number
}

export class ModeManager {
  private libraryService: LibraryService
  private readingStateService: ReadingStateService
  private currentContext: ModeContext
  private transitionCallbacks: Map<string, (context: ModeContext) => void> = new Map()
  private preferences: UserPreferences | null = null

  constructor() {
    this.libraryService = new LibraryService()
    this.readingStateService = new ReadingStateService()
    this.currentContext = {
      mode: 'navigation',
      timestamp: new Date()
    }
    
    this.initializePreferences()
  }

  /**
   * Initialize user preferences
   */
  private async initializePreferences(): Promise<void> {
    try {
      const library = await this.libraryService.getUserLibrary()
      this.preferences = library.preferences
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Use default preferences
      this.preferences = {
        readingMode: 'single-page',
        zoomLevel: 1.0,
        autoPreload: true,
        downloadQuality: 'high',
        notificationsEnabled: true
      }
    }
  }

  /**
   * Get current mode context
   */
  getCurrentContext(): ModeContext {
    return { ...this.currentContext }
  }

  /**
   * Get current mode
   */
  getCurrentMode(): AppMode {
    return this.currentContext.mode
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences | null {
    return this.preferences ? { ...this.preferences } : null
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    if (!this.preferences) {
      await this.initializePreferences()
    }

    this.preferences = { ...this.preferences!, ...updates }
    
    try {
      await this.libraryService.updatePreferences(updates)
      this.notifyPreferencesChanged()
    } catch (error) {
      console.error('Failed to save preferences:', error)
      throw new Error('Failed to update preferences')
    }
  }

  /**
   * Switch to navigation mode with context preservation
   */
  async switchToNavigation(options?: {
    route?: string
    preserveReading?: boolean
    scrollPosition?: number
  }): Promise<ModeContext> {
    const previousContext = { ...this.currentContext }
    
    // Preserve current reading context if requested
    let readingContext = previousContext.readingContext
    if (options?.preserveReading && this.currentContext.mode === 'reading') {
      const currentReadingState = this.readingStateService.getCurrentState()
      if (currentReadingState) {
        readingContext = {
          seriesId: currentReadingState.seriesId,
          chapterId: currentReadingState.chapterId,
          pageNumber: currentReadingState.pageNumber,
          zoomLevel: currentReadingState.zoomLevel,
          scrollPosition: currentReadingState.scrollPosition
        }
        
        // Save reading state before switching
        await this.readingStateService.saveReadingState()
      }
    }

    this.currentContext = {
      mode: 'navigation',
      previousMode: previousContext.mode,
      navigationContext: {
        currentRoute: options?.route || '/',
        scrollPosition: options?.scrollPosition || 0
      },
      readingContext,
      timestamp: new Date()
    }

    this.notifyModeChanged(previousContext, this.currentContext)
    return { ...this.currentContext }
  }

  /**
   * Switch to reading mode with context preservation
   */
  async switchToReading(options: {
    seriesId: string
    chapterId: string
    pageNumber?: number
    preserveNavigation?: boolean
  }): Promise<ModeContext> {
    const previousContext = { ...this.currentContext }
    
    // Preserve current navigation context if requested
    let navigationContext = previousContext.navigationContext
    if (options.preserveNavigation && this.currentContext.mode === 'navigation') {
      navigationContext = {
        currentRoute: window.location.pathname,
        scrollPosition: window.scrollY || 0
      }
    }

    // Initialize reading session
    const initialPage = options.pageNumber || 1
    const readingState = await this.readingStateService.startReadingSession(
      options.seriesId,
      options.chapterId,
      initialPage
    )

    this.currentContext = {
      mode: 'reading',
      previousMode: previousContext.mode,
      navigationContext,
      readingContext: {
        seriesId: options.seriesId,
        chapterId: options.chapterId,
        pageNumber: readingState.pageNumber,
        zoomLevel: readingState.zoomLevel,
        scrollPosition: readingState.scrollPosition
      },
      timestamp: new Date()
    }

    this.notifyModeChanged(previousContext, this.currentContext)
    return { ...this.currentContext }
  }

  /**
   * Resume previous reading session if available
   */
  async resumeReading(seriesId?: string): Promise<ModeContext | null> {
    try {
      let targetSeriesId = seriesId
      let lastReadChapter = null

      if (!targetSeriesId && this.currentContext.readingContext) {
        targetSeriesId = this.currentContext.readingContext.seriesId
      }

      if (targetSeriesId) {
        lastReadChapter = await this.readingStateService.getLastReadChapter(targetSeriesId)
      }

      if (!lastReadChapter) {
        return null
      }

      return await this.switchToReading({
        seriesId: targetSeriesId!,
        chapterId: lastReadChapter.chapterId,
        pageNumber: lastReadChapter.pageNumber,
        preserveNavigation: true
      })
    } catch (error) {
      console.error('Failed to resume reading:', error)
      return null
    }
  }

  /**
   * Update navigation context
   */
  updateNavigationContext(updates: Partial<ModeContext['navigationContext']>): void {
    if (this.currentContext.mode !== 'navigation') return

    this.currentContext.navigationContext = {
      ...this.currentContext.navigationContext!,
      ...updates,
    }
    this.currentContext.timestamp = new Date()
  }

  /**
   * Update reading context
   */
  updateReadingContext(updates: Partial<ModeContext['readingContext']>): void {
    if (this.currentContext.mode !== 'reading') return

    this.currentContext.readingContext = {
      ...this.currentContext.readingContext!,
      ...updates,
    }
    this.currentContext.timestamp = new Date()

    // Update reading state service
    this.readingStateService.updateReadingState({
      pageNumber: updates?.pageNumber,
      zoomLevel: updates?.zoomLevel,
      scrollPosition: updates?.scrollPosition
    })
  }

  /**
   * Register callback for mode changes
   */
  onModeChange(id: string, callback: (context: ModeContext) => void): void {
    this.transitionCallbacks.set(id, callback)
  }

  /**
   * Unregister mode change callback
   */
  offModeChange(id: string): void {
    this.transitionCallbacks.delete(id)
  }

  /**
   * Register callback for preference changes
   */
  onPreferencesChange(id: string, callback: (preferences: UserPreferences) => void): void {
    this.transitionCallbacks.set(`prefs_${id}`, (context) => {
      if (this.preferences) {
        callback(this.preferences)
      }
    })
  }

  /**
   * Unregister preference change callback
   */
  offPreferencesChange(id: string): void {
    this.transitionCallbacks.delete(`prefs_${id}`)
  }

  /**
   * Create smooth transition between modes
   */
  createTransition(options: ModeTransition): Promise<void> {
    return new Promise((resolve) => {
      const duration = options.animationDuration || 300

      // Add transition class to body for CSS animations
      document.body.classList.add('mode-transitioning')
      document.body.classList.add(`transition-${options.fromMode}-to-${options.toMode}`)

      setTimeout(() => {
        document.body.classList.remove('mode-transitioning')
        document.body.classList.remove(`transition-${options.fromMode}-to-${options.toMode}`)
        resolve()
      }, duration)
    })
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.currentContext.mode === 'reading') {
      await this.readingStateService.endReadingSession()
    }
    this.transitionCallbacks.clear()
  }

  /**
   * Notify registered callbacks of mode changes
   */
  private notifyModeChanged(previousContext: ModeContext, newContext: ModeContext): void {
    this.transitionCallbacks.forEach((callback, id) => {
      if (!id.startsWith('prefs_')) {
        try {
          callback(newContext)
        } catch (error) {
          console.error(`Error in mode change callback ${id}:`, error)
        }
      }
    })
  }

  /**
   * Notify registered callbacks of preference changes
   */
  private notifyPreferencesChanged(): void {
    if (!this.preferences) return

    this.transitionCallbacks.forEach((callback, id) => {
      if (id.startsWith('prefs_')) {
        try {
          callback(this.currentContext)
        } catch (error) {
          console.error(`Error in preferences change callback ${id}:`, error)
        }
      }
    })
  }
}

// Singleton instance
export const modeManager = new ModeManager()