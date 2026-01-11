import { FileSystemService } from './FileSystemService'
import { Series, Chapter } from '../types'
import { promises as fs } from 'fs'
import path from 'path'
import { jest } from '@jest/globals'

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-manga-app')
  }
}))

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService
  const testDataPath = '/tmp/test-manga-app'
  const testDownloadsPath = path.join(testDataPath, 'downloads')

  const testSeries: Series = {
    id: 'series-1',
    title: 'Test Manga: Special Edition!',
    author: 'Test Author',
    synopsis: 'A test manga series',
    coverImageUrl: 'https://example.com/cover.jpg',
    genres: ['Action', 'Adventure'],
    status: 'ongoing',
    rating: 4.5,
    totalChapters: 100,
    lastUpdated: new Date('2023-01-01'),
    sourceUrl: 'https://example.com/series/1'
  }

  const testChapter: Chapter = {
    id: 'chapter-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    title: 'The Beginning: Part 1',
    pageCount: 20,
    publishDate: new Date('2023-01-01'),
    isDownloaded: false,
    sourceUrl: 'https://example.com/chapter/1'
  }

  beforeEach(async () => {
    fileSystemService = new FileSystemService()
    
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
    it('should create downloads directory', async () => {
      await fileSystemService.initialize()

      const stats = await fs.stat(testDownloadsPath)
      expect(stats.isDirectory()).toBe(true)
    })
  })

  describe('directory creation', () => {
    beforeEach(async () => {
      await fileSystemService.initialize()
    })

    it('should create series directory with metadata', async () => {
      const seriesPath = await fileSystemService.createSeriesDirectory(testSeries)
      
      expect(seriesPath).toBe(path.join(testDownloadsPath, 'Test-Manga-Special-Edition'))
      
      // Check if directory exists
      const stats = await fs.stat(seriesPath)
      expect(stats.isDirectory()).toBe(true)

      // Check if metadata file exists
      const metadataPath = path.join(seriesPath, 'series-info.json')
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false)
      expect(metadataExists).toBe(true)

      // Verify metadata content
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)
      expect(metadata.id).toBe(testSeries.id)
      expect(metadata.title).toBe(testSeries.title)
    })

    it('should create chapter directory with metadata', async () => {
      // First create series directory
      await fileSystemService.createSeriesDirectory(testSeries)
      
      const chapterPath = await fileSystemService.createChapterDirectory(testSeries, testChapter)
      
      expect(chapterPath).toContain('Chapter-001-The-Beginning-Part-1')
      
      // Check if directory exists
      const stats = await fs.stat(chapterPath)
      expect(stats.isDirectory()).toBe(true)

      // Check if metadata file exists
      const metadataPath = path.join(chapterPath, 'chapter-info.json')
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false)
      expect(metadataExists).toBe(true)

      // Verify metadata content
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)
      expect(metadata.id).toBe(testChapter.id)
      expect(metadata.chapterNumber).toBe(testChapter.chapterNumber)
    })
  })

  describe('path generation', () => {
    beforeEach(async () => {
      await fileSystemService.initialize()
    })

    it('should generate correct page file path', async () => {
      const chapterPath = '/path/to/chapter'
      const pageFilePath = fileSystemService.getPageFilePath(chapterPath, 5, 'png')
      
      expect(pageFilePath).toBe(path.join(chapterPath, 'page-005.png'))
    })

    it('should use default jpg extension for page files', async () => {
      const chapterPath = '/path/to/chapter'
      const pageFilePath = fileSystemService.getPageFilePath(chapterPath, 10)
      
      expect(pageFilePath).toBe(path.join(chapterPath, 'page-010.jpg'))
    })
  })

  describe('content detection', () => {
    beforeEach(async () => {
      await fileSystemService.initialize()
    })

    it('should detect downloaded chapters correctly', async () => {
      // Create series and chapter directories
      await fileSystemService.createSeriesDirectory(testSeries)
      const chapterPath = await fileSystemService.createChapterDirectory(testSeries, testChapter)
      
      // Initially should not be considered downloaded (no page files)
      let isDownloaded = await fileSystemService.isChapterDownloaded(testSeries, testChapter)
      expect(isDownloaded).toBe(false)

      // Add a page file
      const pageFilePath = fileSystemService.getPageFilePath(chapterPath, 1)
      await fs.writeFile(pageFilePath, 'fake image content')

      // Now should be considered downloaded
      isDownloaded = await fileSystemService.isChapterDownloaded(testSeries, testChapter)
      expect(isDownloaded).toBe(true)
    })

    it('should list downloaded series', async () => {
      // Initially no series
      let downloadedSeries = await fileSystemService.getDownloadedSeries()
      expect(downloadedSeries).toHaveLength(0)

      // Create a series
      await fileSystemService.createSeriesDirectory(testSeries)
      
      downloadedSeries = await fileSystemService.getDownloadedSeries()
      expect(downloadedSeries).toHaveLength(1)
      expect(downloadedSeries[0]).toBe('Test-Manga-Special-Edition')
    })

    it('should list downloaded chapters for a series', async () => {
      // Create series directory
      await fileSystemService.createSeriesDirectory(testSeries)
      
      // Initially no chapters
      let downloadedChapters = await fileSystemService.getDownloadedChapters(testSeries)
      expect(downloadedChapters).toHaveLength(0)

      // Create a chapter
      await fileSystemService.createChapterDirectory(testSeries, testChapter)
      
      downloadedChapters = await fileSystemService.getDownloadedChapters(testSeries)
      expect(downloadedChapters).toHaveLength(1)
      expect(downloadedChapters[0]).toContain('Chapter-001')
    })
  })

  describe('file name sanitization', () => {
    beforeEach(async () => {
      await fileSystemService.initialize()
    })

    it('should sanitize series titles with invalid characters', async () => {
      const seriesWithInvalidChars: Series = {
        ...testSeries,
        title: 'Test<>Manga:|With?Invalid*Characters'
      }

      const seriesPath = await fileSystemService.createSeriesDirectory(seriesWithInvalidChars)
      
      // Should remove invalid characters and replace spaces with hyphens
      expect(seriesPath).toContain('TestMangaWithInvalidCharacters')
    })
  })

  describe('cleanup operations', () => {
    beforeEach(async () => {
      await fileSystemService.initialize()
    })

    it('should delete series directory', async () => {
      // Create series directory
      const seriesPath = await fileSystemService.createSeriesDirectory(testSeries)
      
      // Verify it exists
      let stats = await fs.stat(seriesPath)
      expect(stats.isDirectory()).toBe(true)

      // Delete it
      await fileSystemService.deleteSeriesDirectory(testSeries)

      // Verify it's gone
      const exists = await fs.access(seriesPath).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })

    it('should delete chapter directory', async () => {
      // Create series and chapter directories
      await fileSystemService.createSeriesDirectory(testSeries)
      const chapterPath = await fileSystemService.createChapterDirectory(testSeries, testChapter)
      
      // Verify chapter exists
      let stats = await fs.stat(chapterPath)
      expect(stats.isDirectory()).toBe(true)

      // Delete chapter
      await fileSystemService.deleteChapterDirectory(testSeries, testChapter)

      // Verify chapter is gone
      const exists = await fs.access(chapterPath).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })
  })
})