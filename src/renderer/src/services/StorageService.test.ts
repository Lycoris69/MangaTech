import { StorageService } from './StorageService'
import { UserLibrary, Series, DownloadTask } from '../types'
import { promises as fs } from 'fs'
import path from 'path'
import { jest } from '@jest/globals'

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-manga-app')
  }
}))

describe('StorageService', () => {
  let storageService: StorageService
  const testDataPath = '/tmp/test-manga-app'

  beforeEach(async () => {
    storageService = new StorageService()

    // Clean up test directory
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // Directory might not exist
    }
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // Directory might not exist
    }
  })

  describe('initialize', () => {
    it('should create user data directory and default files', async () => {
      await storageService.initialize()

      // Check if directory exists
      const stats = await fs.stat(testDataPath)
      expect(stats.isDirectory()).toBe(true)

      // Check if default files exist
      const libraryPath = path.join(testDataPath, 'user-library.json')
      const seriesPath = path.join(testDataPath, 'series-metadata.json')
      const downloadsPath = path.join(testDataPath, 'download-tasks.json')

      await expect(fs.access(libraryPath)).resolves.not.toThrow()
      await expect(fs.access(seriesPath)).resolves.not.toThrow()
      await expect(fs.access(downloadsPath)).resolves.not.toThrow()
    })
  })

  describe('user library operations', () => {
    beforeEach(async () => {
      await storageService.initialize()
    })

    it('should save and load user library correctly', async () => {
      const testLibrary: UserLibrary = {
        userId: 'test-user',
        favorites: [{
          seriesId: 'series-1',
          dateAdded: new Date('2023-01-01'),
          notificationsEnabled: true
        }],
        downloads: [{
          seriesId: 'series-1',
          downloadPath: '/path/to/series',
          downloadDate: new Date('2023-01-02'),
          chapters: ['chapter-1', 'chapter-2']
        }],
        readingProgress: [{
          seriesId: 'series-1',
          chapterId: 'chapter-1',
          pageNumber: 5,
          lastReadDate: new Date('2023-01-03')
        }],
        preferences: {
          readingMode: 'double-page',
          zoomLevel: 1.5,
          autoPreload: false,
          downloadQuality: 'medium',
          notificationsEnabled: false
        }
      }

      await storageService.saveUserLibrary(testLibrary)
      const loadedLibrary = await storageService.loadUserLibrary()

      expect(loadedLibrary.userId).toBe(testLibrary.userId)
      expect(loadedLibrary.favorites).toHaveLength(1)
      expect(loadedLibrary.favorites[0].seriesId).toBe('series-1')
      expect(loadedLibrary.favorites[0].dateAdded).toEqual(new Date('2023-01-01'))
      expect(loadedLibrary.preferences.readingMode).toBe('double-page')
    })
  })

  describe('series metadata operations', () => {
    beforeEach(async () => {
      await storageService.initialize()
    })

    it('should save and load series metadata correctly', async () => {
      const testSeries: Series[] = [{
        id: 'series-1',
        title: 'Test Manga',
        author: 'Test Author',
        synopsis: 'A test manga series',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Action', 'Adventure'],
        status: 'ongoing',
        rating: 4.5,
        totalChapters: 100,
        lastUpdated: new Date('2023-01-01'),
        sourceUrl: 'https://example.com/series/1'
      }]

      await storageService.saveSeriesMetadata(testSeries)
      const loadedSeries = await storageService.loadSeriesMetadata()

      expect(loadedSeries).toHaveLength(1)
      expect(loadedSeries[0].id).toBe('series-1')
      expect(loadedSeries[0].title).toBe('Test Manga')
      expect(loadedSeries[0].lastUpdated).toEqual(new Date('2023-01-01'))
    })

    it('should upsert series correctly', async () => {
      const series: Series = {
        id: 'series-1',
        title: 'Test Manga',
        author: 'Test Author',
        synopsis: 'A test manga series',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Action'],
        status: 'ongoing',
        rating: 4.0,
        totalChapters: 50,
        lastUpdated: new Date('2023-01-01'),
        sourceUrl: 'https://example.com/series/1'
      }

      // Insert new series
      await storageService.upsertSeries(series)
      let loadedSeries = await storageService.loadSeriesMetadata()
      expect(loadedSeries).toHaveLength(1)

      // Update existing series
      const updatedSeries = { ...series, totalChapters: 75, rating: 4.5 }
      await storageService.upsertSeries(updatedSeries)
      loadedSeries = await storageService.loadSeriesMetadata()

      expect(loadedSeries).toHaveLength(1)
      expect(loadedSeries[0].totalChapters).toBe(75)
      expect(loadedSeries[0].rating).toBe(4.5)
    })

    it('should get series by ID correctly', async () => {
      const series: Series = {
        id: 'series-1',
        title: 'Test Manga',
        author: 'Test Author',
        synopsis: 'A test manga series',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Action'],
        status: 'ongoing',
        rating: 4.0,
        totalChapters: 50,
        lastUpdated: new Date('2023-01-01'),
        sourceUrl: 'https://example.com/series/1'
      }

      await storageService.upsertSeries(series)

      const foundSeries = await storageService.getSeriesById('series-1')
      expect(foundSeries).not.toBeNull()
      expect(foundSeries?.title).toBe('Test Manga')

      const notFoundSeries = await storageService.getSeriesById('non-existent')
      expect(notFoundSeries).toBeNull()
    })
  })

  describe('file integrity verification', () => {
    it('should verify file integrity correctly', async () => {
      // Create a test file
      const testFilePath = path.join(testDataPath, 'test-file.txt')
      await fs.mkdir(testDataPath, { recursive: true })
      await fs.writeFile(testFilePath, 'test content')

      const isValid = await storageService.verifyFileIntegrity(testFilePath)
      expect(isValid).toBe(true)

      // Test non-existent file
      const isInvalid = await storageService.verifyFileIntegrity('/non/existent/file.txt')
      expect(isInvalid).toBe(false)
    })
  })
})