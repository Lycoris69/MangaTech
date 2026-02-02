import { ReadingStateService } from './ReadingStateService'
import { LibraryService } from './LibraryService'

// Mock LibraryService
jest.mock('./LibraryService')

describe('ReadingStateService', () => {
  let readingStateService: ReadingStateService
  let mockLibraryService: jest.Mocked<LibraryService>

  beforeEach(() => {
    jest.clearAllMocks()
    readingStateService = new ReadingStateService()
    mockLibraryService = (readingStateService as unknown as { libraryService: jest.Mocked<LibraryService> }).libraryService
  })

  afterEach(() => {
    // Clean up any running intervals
    const service = readingStateService as unknown as { autoSaveInterval: NodeJS.Timeout | null }
    if (service.autoSaveInterval) {
      clearInterval(service.autoSaveInterval)
    }
  })

  describe('startReadingSession', () => {
    it('should start a new reading session with default values', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])

      const state = await readingStateService.startReadingSession('series-1', 'chapter-1')

      expect(state).toEqual({
        seriesId: 'series-1',
        chapterId: 'chapter-1',
        pageNumber: 1,
        zoomLevel: 1,
        timestamp: expect.any(Date)
      })
      expect(mockLibraryService.getReadingProgress).toHaveBeenCalledWith('series-1')
    })

    it('should restore previous reading position if available', async () => {
      const mockProgress = [
        {
          seriesId: 'series-1',
          chapterId: 'chapter-1',
          pageNumber: 5,
          lastReadDate: new Date()
        }
      ]
      mockLibraryService.getReadingProgress.mockResolvedValue(mockProgress)

      const state = await readingStateService.startReadingSession('series-1', 'chapter-1')

      expect(state.pageNumber).toBe(5)
    })

    it('should use initial page if no previous progress exists', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])

      const state = await readingStateService.startReadingSession('series-1', 'chapter-1', 10)

      expect(state.pageNumber).toBe(10)
    })
  })

  describe('updateReadingState', () => {
    it('should update reading state properties', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])

      await readingStateService.startReadingSession('series-1', 'chapter-1')

      readingStateService.updateReadingState({
        pageNumber: 5,
        zoomLevel: 1.5
      })

      const currentState = readingStateService.getCurrentState()
      expect(currentState?.pageNumber).toBe(5)
      expect(currentState?.zoomLevel).toBe(1.5)
    })

    it('should not update if no active session', () => {
      readingStateService.updateReadingState({ pageNumber: 5 })

      const currentState = readingStateService.getCurrentState()
      expect(currentState).toBeNull()
    })
  })

  describe('saveReadingState', () => {
    it('should save current state to library service', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])
      mockLibraryService.markAsRead.mockResolvedValue()

      await readingStateService.startReadingSession('series-1', 'chapter-1')
      readingStateService.updateReadingState({ pageNumber: 3 })

      await readingStateService.saveReadingState()

      expect(mockLibraryService.markAsRead).toHaveBeenCalledWith('series-1', 'chapter-1', 3)
    })

    it('should not save if no active session', async () => {
      await readingStateService.saveReadingState()

      expect(mockLibraryService.markAsRead).not.toHaveBeenCalled()
    })
  })

  describe('endReadingSession', () => {
    it('should save state and clear current session', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])
      mockLibraryService.markAsRead.mockResolvedValue()

      await readingStateService.startReadingSession('series-1', 'chapter-1')
      await readingStateService.endReadingSession()

      expect(mockLibraryService.markAsRead).toHaveBeenCalled()
      expect(readingStateService.getCurrentState()).toBeNull()
    })
  })

  describe('getLastReadingPosition', () => {
    it('should return last reading position for chapter', async () => {
      const mockProgress = [
        {
          seriesId: 'series-1',
          chapterId: 'chapter-1',
          pageNumber: 5,
          lastReadDate: new Date()
        }
      ]
      mockLibraryService.getReadingProgress.mockResolvedValue(mockProgress)

      const result = await readingStateService.getLastReadingPosition('series-1', 'chapter-1')

      expect(result).toEqual(mockProgress[0])
    })

    it('should return null if no progress found', async () => {
      mockLibraryService.getReadingProgress.mockResolvedValue([])

      const result = await readingStateService.getLastReadingPosition('series-1', 'chapter-1')

      expect(result).toBeNull()
    })
  })

  describe('getLastReadChapter', () => {
    it('should return last read chapter for series', async () => {
      const mockProgress = {
        seriesId: 'series-1',
        chapterId: 'chapter-5',
        pageNumber: 10,
        lastReadDate: new Date()
      }
      mockLibraryService.getLastReadChapter.mockResolvedValue(mockProgress)

      const result = await readingStateService.getLastReadChapter('series-1')

      expect(result).toEqual(mockProgress)
      expect(mockLibraryService.getLastReadChapter).toHaveBeenCalledWith('series-1')
    })
  })
})