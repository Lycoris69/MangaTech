import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LibraryService } from '../services/LibraryService'
import { StorageService } from '../services/StorageService'
import './OnlineReader.css'

interface PageData {
  imageUrl: string
  pageNumber: number
  chapterId: string
}

interface LoadedChapter {
  chapterId: string
  title: string
  pages: PageData[]
}

interface ChapterMetadata {
  id: string
  title: string
  chapterUrl: string
  chapterNumber: number
}

interface OnlineReaderProps {
  chapterId: string
  onClose: () => void
  onPageChange?: (pageNumber: number) => void
  onZoomChange?: (zoomLevel: number) => void
  initialPage?: number
  initialZoom?: number
  seriesId?: string
}

const OnlineReader: React.FC<OnlineReaderProps> = ({
  chapterId,
  onClose,
  onPageChange,
  onZoomChange,
  initialPage = 1,
  initialZoom = 1,
  seriesId
}) => {
  // State
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([])
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [activeChapterId, setActiveChapterId] = useState(chapterId)
  const [allChapters, setAllChapters] = useState<ChapterMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingNext, setIsFetchingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(initialZoom)
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map()) // Keyed by chapterId-pageNumber
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set())

  // Refs
  const libraryService = new LibraryService()
  const storageService = new StorageService()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const loadingTriggerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // -- Helper functions --

  const scrollToPage = useCallback((cId: string, pageNumber: number) => {
    const pageElement = document.getElementById(`page-${cId}-${pageNumber}`)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const preloadImage = useCallback(async (url: string, cId: string, pNum: number) => {
    const key = `${cId}-${pNum}`
    if (imageCache.has(key) || loadingPages.has(key)) return

    setLoadingPages(prev => new Set(prev).add(key))

    return new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        setImageCache(prev => new Map(prev).set(key, url))
        setLoadingPages(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
        resolve()
      }
      img.onerror = () => {
        setLoadingPages(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
        resolve()
      }
      img.src = url
    })
  }, [imageCache, loadingPages])

  const fetchAndAppendChapter = async (targetChapterId: string, shouldScroll = false, metadataList?: ChapterMetadata[]) => {
    try {
      const pageUrls = await window.electronAPI.scraper.getChapterPages(targetChapterId)

      const newChapter: LoadedChapter = {
        chapterId: targetChapterId,
        title: '',
        pages: pageUrls.map((p: any, i: number) => ({
          imageUrl: p.imageUrl,
          pageNumber: i + 1,
          chapterId: targetChapterId
        }))
      }

      // Find title from provided list or state
      const sourceList = metadataList || allChapters
      const meta = sourceList.find(c => c.id === targetChapterId)
      if (meta) newChapter.title = meta.title

      setLoadedChapters(prev => {
        if (prev.some(c => c.chapterId === targetChapterId)) return prev
        return [...prev, newChapter]
      })

      // Start preloading current chapter immediately
      if (newChapter.pages.length > 0) {
        // Just preload the first few to get things moving
        for (let i = 0; i < Math.min(newChapter.pages.length, 3); i++) {
          preloadImage(newChapter.pages[i].imageUrl, targetChapterId, i + 1)
        }
      }

      if (shouldScroll) {
        setTimeout(() => scrollToPage(targetChapterId, initialPage), 500)
      }
    } catch (err) {
      console.error('Failed to fetch chapter:', err)
      throw err
    }
  }

  const loadNextChapter = async () => {
    if (isFetchingNext || allChapters.length === 0) return

    const lastLoadedId = loadedChapters[loadedChapters.length - 1]?.chapterId
    if (!lastLoadedId) return

    const currentIndex = allChapters.findIndex(c => c.id === lastLoadedId)
    // Chapters list is sorted ASC (1 -> 2 -> ...), so next is index + 1
    if (currentIndex >= 0 && currentIndex < allChapters.length - 1) {
      const nextChapter = allChapters[currentIndex + 1]
      setIsFetchingNext(true)
      try {
        await fetchAndAppendChapter(nextChapter.id)
      } finally {
        setIsFetchingNext(false)
      }
    }
  }

  // Navigation handlers
  const goToNextPage = useCallback(() => {
    const currentChapIdx = loadedChapters.findIndex(c => c.chapterId === activeChapterId)
    if (currentChapIdx === -1) return

    const chapter = loadedChapters[currentChapIdx]
    if (currentPage < chapter.pages.length) {
      scrollToPage(activeChapterId, currentPage + 1)
    } else if (currentChapIdx < loadedChapters.length - 1) {
      const nextChap = loadedChapters[currentChapIdx + 1]
      scrollToPage(nextChap.chapterId, 1)
    }
  }, [currentPage, activeChapterId, loadedChapters, scrollToPage])

  const goToPreviousPage = useCallback(() => {
    const currentChapIdx = loadedChapters.findIndex(c => c.chapterId === activeChapterId)
    if (currentChapIdx === -1) return

    if (currentPage > 1) {
      scrollToPage(activeChapterId, currentPage - 1)
    } else if (currentChapIdx > 0) {
      const prevChap = loadedChapters[currentChapIdx - 1]
      scrollToPage(prevChap.chapterId, prevChap.pages.length)
    }
  }, [currentPage, activeChapterId, loadedChapters, scrollToPage])

  // -- Effects --

  // Initialize: Load series metadata and first chapter
  useEffect(() => {
    const initializeReader = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (seriesId) {
          // 1. Try local metadata first (Instant)
          let seriesDetails = await storageService.getSeriesById(seriesId)

          // 2. Fallback to scraper if local not found
          if (!seriesDetails) {
            try {
              seriesDetails = await window.electronAPI.scraper.getSeriesDetails(seriesId)
            } catch (err) {
              console.log('Failed to fetch online metadata', err)
            }
          }

          if (!seriesDetails) {
            throw new Error('Series details not found. Please connect to the internet.')
          }

          const parseChapterNum = (val: string) => {
            if (!val) return 0
            // Handle regional comma as decimal (e.g. 74,5 -> 74.5)
            const normalized = val.replace(',', '.')
            const num = parseFloat(normalized.replace(/[^0-9.]/g, ''))
            return isNaN(num) ? 0 : num
          }

          const meta: ChapterMetadata[] = (seriesDetails.chapters || []).map((c: any) => ({
            id: c.chapterUrl || c.id,
            title: c.title || `Chapter ${c.chapterNumber}`,
            chapterUrl: c.chapterUrl,
            chapterNumber: parseChapterNum(c.chapterNumber)
          })).sort((a: ChapterMetadata, b: ChapterMetadata) => a.chapterNumber - b.chapterNumber)

          setAllChapters(meta)
          // Pass the meta list directly so the first chapter gets its title immediately
          await fetchAndAppendChapter(chapterId, initialPage > 1, meta)
        } else {
          await fetchAndAppendChapter(chapterId, initialPage > 1)
        }
      } catch (err: any) {
        console.error('Initialization error:', err)
        setError(err.message || 'Failed to open reader')
      } finally {
        setIsLoading(false)
      }
    }
    initializeReader()
  }, [chapterId, seriesId])

  // Intersection Observer for Current Page/Chapter
  useEffect(() => {
    if (loadedChapters.length === 0 || !pageContainerRef.current) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cId = entry.target.getAttribute('data-chapter') || ''
          const pNum = parseInt(entry.target.getAttribute('data-page') || '1')

          setCurrentPage(pNum)
          setActiveChapterId(cId)
          onPageChange?.(pNum)

          // Auto-save progress
          if (seriesId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
            saveTimeoutRef.current = setTimeout(() => {
              libraryService.markAsRead(seriesId, cId, pNum)
            }, 1000)
          }
        }
      })
    }, { root: pageContainerRef.current, threshold: 0.1 })

    const elements = document.querySelectorAll('.webtoon-page-item')
    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [loadedChapters, seriesId, onPageChange])

  // Intersection Observer for Loading Next Chapter
  useEffect(() => {
    if (!loadingTriggerRef.current || !pageContainerRef.current) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadNextChapter()
      }
    }, { root: pageContainerRef.current, rootMargin: '400px', threshold: 0.1 })

    observer.observe(loadingTriggerRef.current)
    return () => observer.disconnect()
  }, [loadedChapters, allChapters, isFetchingNext])

  // Lazy Preloading
  useEffect(() => {
    if (loadedChapters.length === 0) return

    const currentChapter = loadedChapters.find(c => c.chapterId === activeChapterId)
    if (!currentChapter) return

    const currentIndex = currentChapter.pages.findIndex(p => p.pageNumber === currentPage)
    if (currentIndex === -1) return

    // Preload current page and next 5 pages across chapter boundaries
    let found = 0
    let cIdx = loadedChapters.findIndex(c => c.chapterId === activeChapterId)
    let pIdx = currentIndex // Start including the current page if not loaded

    while (cIdx < loadedChapters.length && found < 6) {
      const chapter = loadedChapters[cIdx]
      while (pIdx < chapter.pages.length && found < 6) {
        const page = chapter.pages[pIdx]
        if (!imageCache.has(`${page.chapterId}-${page.pageNumber}`)) {
          preloadImage(page.imageUrl, page.chapterId, page.pageNumber)
        }
        found++
        pIdx++
      }
      cIdx++
      pIdx = 0
    }
  }, [currentPage, activeChapterId, loadedChapters, imageCache, preloadImage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault(); goToPreviousPage(); break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault(); goToNextPage(); break
        case 'Escape':
          e.preventDefault(); onClose(); break
        case '+':
        case '=':
          e.preventDefault(); setZoomLevel(z => Math.min(z + 0.25, 3)); break
        case '-':
          e.preventDefault(); setZoomLevel(z => Math.max(z - 0.25, 0.5)); break
        case '0':
          e.preventDefault(); setZoomLevel(1); break
        case 'f':
        case 'F':
          e.preventDefault(); toggleFullscreen(); break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNextPage, goToPreviousPage, onClose])

  // Controls auto-hide
  useEffect(() => {
    if (!showControls) return
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current) }
  }, [showControls, currentPage])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error('Fullscreen failed:', err))
    } else {
      document.exitFullscreen()
    }
  }

  // -- Render --

  if (isLoading) {
    return (
      <div className="online-reader loading" ref={containerRef}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing reader...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="online-reader error" ref={containerRef}>
        <div className="error-message">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={onClose} className="close-btn-large">Close Reader</button>
        </div>
      </div>
    )
  }

  return (
    <div className="online-reader" ref={containerRef}>
      {/* Header Controls */}
      <div className={`reading-controls ${showControls ? 'visible' : 'hidden'}`}>
        <div className="controls-left">
          <button onClick={onClose} className="close-button">✕</button>
          <span className="chapter-info">
            {loadedChapters.find(c => c.chapterId === activeChapterId)?.title || 'Chapter'}: Page {currentPage}
          </span>
        </div>

        <div className="controls-center">
          <button onClick={goToPreviousPage} className="nav-button">←</button>
          <span className="page-indicator">{currentPage}</span>
          <button onClick={goToNextPage} className="nav-button">→</button>
        </div>

        <div className="controls-right">
          <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="zoom-button">−</button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))} className="zoom-button">+</button>
          <button onClick={() => setZoomLevel(1)} className="zoom-button" title="Reset Zoom">⌂</button>
          <button onClick={toggleFullscreen} className="zoom-button">⛶</button>
        </div>
      </div>

      {/* Main Content (Infinite Scroll) */}
      <div
        className="page-container"
        ref={pageContainerRef}
        onClick={() => setShowControls(!showControls)}
        onMouseMove={() => setShowControls(true)}
        style={{ '--zoom-level': zoomLevel } as any}
      >
        {loadedChapters.map((chapter) => (
          <div key={chapter.chapterId} className="chapter-section">
            <div className="chapter-divider">
              <h3>{chapter.title}</h3>
            </div>
            {chapter.pages.map((page) => {
              const key = `${page.chapterId}-${page.pageNumber}`
              const isLoaded = imageCache.has(key)
              // STRICT LAZY LOADING: Only set src if loaded in state cache
              // This prevents browser from auto-fetching all 50+ images at once
              const url = isLoaded ? imageCache.get(key) : ''

              return (
                <div
                  key={key}
                  id={`page-${page.chapterId}-${page.pageNumber}`}
                  className="webtoon-page-item"
                  data-chapter={page.chapterId}
                  data-page={page.pageNumber}
                >
                  {!isLoaded && (
                    <div className="page-loading-fallback">
                      <div className="spinner"></div>
                      <p>Page {page.pageNumber}</p>
                    </div>
                  )}
                  <img
                    src={url || undefined}
                    alt={`${chapter.title} - Page ${page.pageNumber}`}
                    className={`page-image ${zoomLevel !== 1 ? 'zoomed' : ''}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    style={{ opacity: isLoaded ? 1 : 0 }}
                  />
                </div>
              )
            })}
          </div>
        ))}

        {/* Load Next Tracker */}
        <div ref={loadingTriggerRef} className="next-chapter-trigger">
          {isFetchingNext ? (
            <div className="fetching-indicator">
              <div className="spinner"></div>
              <span>Streaming next chapter...</span>
            </div>
          ) : allChapters.findIndex(c => c.id === activeChapterId) < allChapters.length - 1 ? (
            <div className="scroll-hint">Scroll for next chapter</div>
          ) : (
            <div className="end-section">
              <div className="end-hint">🎉 You've reached the end!</div>
              <button
                className="back-to-series-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                Back to Series
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      {showControls && (
        <div className="cache-status">
          <span>{imageCache.size} Images Buffered</span>
        </div>
      )}
    </div>
  )
}

export default OnlineReader