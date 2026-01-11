import { useState, useEffect, useCallback, useRef } from 'react'
import { modeManager, AppMode, ModeContext } from '../services/ModeManager'
import { UserPreferences } from '../types'

interface UseModeManagerReturn {
  currentMode: AppMode
  context: ModeContext
  preferences: UserPreferences | null
  isTransitioning: boolean
  switchToNavigation: (options?: {
    route?: string
    preserveReading?: boolean
    scrollPosition?: number
  }) => Promise<ModeContext>
  switchToReading: (options: {
    seriesId: string
    chapterId: string
    pageNumber?: number
    preserveNavigation?: boolean
  }) => Promise<ModeContext>
  resumeReading: (seriesId?: string) => Promise<ModeContext | null>
  updateNavigationContext: (updates: Partial<ModeContext['navigationContext']>) => void
  updateReadingContext: (updates: Partial<ModeContext['readingContext']>) => void
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

export const useModeManager = (): UseModeManagerReturn => {
  const [currentMode, setCurrentMode] = useState<AppMode>(modeManager.getCurrentMode())
  const [context, setContext] = useState<ModeContext>(modeManager.getCurrentContext())
  const [preferences, setPreferences] = useState<UserPreferences | null>(modeManager.getPreferences())
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const hookIdRef = useRef<string>()

  // Initialize hook ID
  useEffect(() => {
    hookIdRef.current = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return () => {
      if (hookIdRef.current) {
        modeManager.offModeChange(hookIdRef.current)
        modeManager.offPreferencesChange(hookIdRef.current)
      }
    }
  }, [])

  // Register for mode changes
  useEffect(() => {
    if (!hookIdRef.current) return

    const handleModeChange = (newContext: ModeContext) => {
      setCurrentMode(newContext.mode)
      setContext(newContext)
    }

    const handlePreferencesChange = (newPreferences: UserPreferences) => {
      setPreferences(newPreferences)
    }

    modeManager.onModeChange(hookIdRef.current, handleModeChange)
    modeManager.onPreferencesChange(hookIdRef.current, handlePreferencesChange)

    // Initial sync
    setCurrentMode(modeManager.getCurrentMode())
    setContext(modeManager.getCurrentContext())
    setPreferences(modeManager.getPreferences())

    return () => {
      if (hookIdRef.current) {
        modeManager.offModeChange(hookIdRef.current)
        modeManager.offPreferencesChange(hookIdRef.current)
      }
    }
  }, [])

  const switchToNavigation = useCallback(async (options?: {
    route?: string
    preserveReading?: boolean
    scrollPosition?: number
  }): Promise<ModeContext> => {
    setIsTransitioning(true)
    
    try {
      // Create transition animation
      await modeManager.createTransition({
        fromMode: currentMode,
        toMode: 'navigation',
        preserveContext: options?.preserveReading || false,
        animationDuration: 300
      })

      const newContext = await modeManager.switchToNavigation(options)
      return newContext
    } finally {
      setIsTransitioning(false)
    }
  }, [currentMode])

  const switchToReading = useCallback(async (options: {
    seriesId: string
    chapterId: string
    pageNumber?: number
    preserveNavigation?: boolean
  }): Promise<ModeContext> => {
    setIsTransitioning(true)
    
    try {
      // Create transition animation
      await modeManager.createTransition({
        fromMode: currentMode,
        toMode: 'reading',
        preserveContext: options.preserveNavigation || false,
        animationDuration: 300
      })

      const newContext = await modeManager.switchToReading(options)
      return newContext
    } finally {
      setIsTransitioning(false)
    }
  }, [currentMode])

  const resumeReading = useCallback(async (seriesId?: string): Promise<ModeContext | null> => {
    setIsTransitioning(true)
    
    try {
      const result = await modeManager.resumeReading(seriesId)
      if (result) {
        // Create transition animation
        await modeManager.createTransition({
          fromMode: currentMode,
          toMode: 'reading',
          preserveContext: true,
          animationDuration: 300
        })
      }
      return result
    } finally {
      setIsTransitioning(false)
    }
  }, [currentMode])

  const updateNavigationContext = useCallback((updates: Partial<ModeContext['navigationContext']>) => {
    modeManager.updateNavigationContext(updates)
  }, [])

  const updateReadingContext = useCallback((updates: Partial<ModeContext['readingContext']>) => {
    modeManager.updateReadingContext(updates)
  }, [])

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>): Promise<void> => {
    await modeManager.updatePreferences(updates)
  }, [])

  return {
    currentMode,
    context,
    preferences,
    isTransitioning,
    switchToNavigation,
    switchToReading,
    resumeReading,
    updateNavigationContext,
    updateReadingContext,
    updatePreferences
  }
}