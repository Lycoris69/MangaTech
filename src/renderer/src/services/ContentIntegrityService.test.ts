import { ContentIntegrityService } from './ContentIntegrityService'
import { FileSystemService } from './FileSystemService'
import { StorageService } from './StorageService'
import { Series, Chapter } from '../types'

// Mock the dependencies
jest.mock('./FileSystemService')
jest.mock('./StorageService')

describe('ContentIntegrityService', () => {
  let contentIntegrityService: ContentIntegrityService
  let mockFileSystemService: jest.Mocked<FileSystemService>
  let mockStorageService: jest.Mocked<StorageService>

  const mockSeries: Series = {
    id: 'test-series-1',
    title: 'Test Manga',
    author: 'Test Author',
    synopsis: 'Test synopsis',
    coverImageUrl: 'http://example.com/cover.jpg',
    genres: ['Action', 'Adventure'],
    status: 'ongoing',
    rating: 4.5,
    totalChapters: 10,
    lastUpdated: new Date(),
    sourceUrl: 'http://example.com/series/1'
  }

  beforeEach(() => {
    mockFileSystemService = new FileSystemService() as jest.Mocked<FileSystemService>
    mockStorageService = new StorageService() as jest.Mocked<StorageService>
    contentIntegrityService = new ContentIntegrityService(mockFileSystemService, mockStorageService)
  })

  describe('detectDuplicates', () => {
    it('should detect duplicate files and calculate statistics', async () => {
      // Mock duplicate files
      const mockDuplicates = new Map([
        ['hash1', ['/path/to/file1.jpg', '/path/to/file1_copy.jpg']],
        ['hash2', ['/path/to/file2.jpg', '/path/to/file2_copy.jpg', '/path/to/file2_copy2.jpg']]
      ])

      mockFileSystemService.detectDuplicateFiles.mockResolvedValue(mockDuplicates)

      // Mock fs.stat for size calculation
      const mockStat = jest.fn()
        .mockResolvedValueOnce({ size: 1000 }) // file1
        .mockResolvedValueOnce({ size: 2000 }) // file2

      jest.doMock('fs', () => ({
        promises: {
          stat: mockStat
        }
      }))

      const result = await contentIntegrityService.detectDuplicates()

      expect(result.totalFiles).toBe(5) // 2 + 3 files
      expect(result.totalDuplicates).toBe(3) // 1 + 2 duplicates
      expect(result.duplicateGroups).toBe(mockDuplicates)
      expect(mockFileSystemService.detectDuplicateFiles).toHaveBeenCalled()
    })

    it('should handle errors during duplicate detection', async () => {
      mockFileSystemService.detectDuplicateFiles.mockRejectedValue(new Error('File system error'))

      await expect(contentIntegrityService.detectDuplicates()).rejects.toThrow('Failed to detect duplicates')
    })
  })

  describe('verifyAllContentIntegrity', () => {
    it('should verify integrity of all downloaded content', async () => {
      const mockSeriesMetadata = [mockSeries]
      mockStorageService.loadSeriesMetadata.mockResolvedValue(mockSeriesMetadata)
      
      // Mock that the series has downloaded chapters
      mockFileSystemService.getDownloadedChapters.mockResolvedValue(['Chapter-001', 'Chapter-002'])

      const mockSeriesIntegrity = {
        totalChapters: 2,
        validChapters: 1,
        corruptedChapters: ['chapter-2'],
        missingChapters: [],
        fileIntegrityResults: new Map([
          ['Chapter-001', {
            totalFiles: 10,
            validFiles: 10,
            corruptedFiles: [],
            missingFiles: []
          }],
          ['Chapter-002', {
            totalFiles: 8,
            validFiles: 5,
            corruptedFiles: ['/path/to/corrupted.jpg'],
            missingFiles: ['/path/to/missing.jpg']
          }]
        ])
      }

      mockFileSystemService.verifySeriesIntegrity.mockResolvedValue(mockSeriesIntegrity)

      const result = await contentIntegrityService.verifyAllContentIntegrity()

      expect(result.totalFiles).toBe(18) // 10 + 8
      expect(result.validFiles).toBe(15) // 10 + 5
      expect(result.corruptedFiles).toHaveLength(1)
      expect(result.missingFiles).toHaveLength(1)
      expect(mockStorageService.loadSeriesMetadata).toHaveBeenCalled()
      expect(mockFileSystemService.getDownloadedChapters).toHaveBeenCalledWith(mockSeries)
      expect(mockFileSystemService.verifySeriesIntegrity).toHaveBeenCalledWith(mockSeries)
    })
  })

  describe('verifySeriesIntegrity', () => {
    it('should verify integrity for a specific series', async () => {
      const mockIntegrityResult = {
        totalChapters: 5,
        validChapters: 4,
        corruptedChapters: ['chapter-5'],
        missingChapters: [],
        fileIntegrityResults: new Map()
      }

      mockFileSystemService.verifySeriesIntegrity.mockResolvedValue(mockIntegrityResult)

      const result = await contentIntegrityService.verifySeriesIntegrity(mockSeries)

      expect(result.seriesId).toBe(mockSeries.id)
      expect(result.seriesTitle).toBe(mockSeries.title)
      expect(result.totalChapters).toBe(5)
      expect(result.validChapters).toBe(4)
      expect(result.corruptedChapters).toEqual(['chapter-5'])
      expect(mockFileSystemService.verifySeriesIntegrity).toHaveBeenCalledWith(mockSeries)
    })
  })

  describe('resolveContentIssues', () => {
    it('should resolve duplicates and corrupted files based on options', async () => {
      const mockDuplicates = {
        totalFiles: 10,
        duplicateGroups: new Map([['hash1', ['/file1.jpg', '/file1_copy.jpg']]]),
        totalDuplicates: 1,
        potentialSpaceSaved: 1000
      }

      const mockIntegrity = {
        totalFiles: 20,
        validFiles: 18,
        corruptedFiles: ['/corrupted.jpg'],
        missingFiles: ['/missing.jpg'],
        errors: []
      }

      const options = {
        removeDuplicates: true,
        removeCorrupted: true,
        redownloadMissing: true,
        createBackup: false
      }

      mockFileSystemService.removeDuplicateFiles.mockResolvedValue({
        removedFiles: ['/file1_copy.jpg'],
        errors: []
      })

      mockFileSystemService.removeCorruptedFiles.mockResolvedValue({
        removedFiles: ['/corrupted.jpg'],
        errors: []
      })

      const result = await contentIntegrityService.resolveContentIssues(mockDuplicates, mockIntegrity, options)

      expect(result.duplicatesRemoved).toBe(1)
      expect(result.corruptedRemoved).toBe(1)
      expect(result.redownloadRequired).toEqual(['/corrupted.jpg', '/missing.jpg'])
      expect(mockFileSystemService.removeDuplicateFiles).toHaveBeenCalledWith(mockDuplicates.duplicateGroups)
      expect(mockFileSystemService.removeCorruptedFiles).toHaveBeenCalledWith(mockIntegrity.corruptedFiles)
    })

    it('should skip operations based on options', async () => {
      const mockDuplicates = {
        totalFiles: 10,
        duplicateGroups: new Map(),
        totalDuplicates: 0,
        potentialSpaceSaved: 0
      }

      const mockIntegrity = {
        totalFiles: 20,
        validFiles: 20,
        corruptedFiles: [],
        missingFiles: [],
        errors: []
      }

      const options = {
        removeDuplicates: false,
        removeCorrupted: false,
        redownloadMissing: false,
        createBackup: false
      }

      const result = await contentIntegrityService.resolveContentIssues(mockDuplicates, mockIntegrity, options)

      expect(result.duplicatesRemoved).toBe(0)
      expect(result.corruptedRemoved).toBe(0)
      expect(result.redownloadRequired).toEqual([])
      expect(mockFileSystemService.removeDuplicateFiles).not.toHaveBeenCalled()
      expect(mockFileSystemService.removeCorruptedFiles).not.toHaveBeenCalled()
    })
  })

  describe('generateContentHealthReport', () => {
    it('should generate comprehensive health report with recommendations', async () => {
      const mockDuplicates = {
        totalFiles: 100,
        duplicateGroups: new Map([['hash1', ['/file1.jpg', '/file1_copy.jpg']]]),
        totalDuplicates: 1,
        potentialSpaceSaved: 1048576 // 1 MB
      }

      const mockIntegrity = {
        totalFiles: 100,
        validFiles: 95,
        corruptedFiles: ['/corrupted.jpg'],
        missingFiles: ['/missing.jpg'],
        errors: []
      }

      jest.spyOn(contentIntegrityService, 'detectDuplicates').mockResolvedValue(mockDuplicates)
      jest.spyOn(contentIntegrityService, 'verifyAllContentIntegrity').mockResolvedValue(mockIntegrity)

      const result = await contentIntegrityService.generateContentHealthReport()

      expect(result.duplicates).toBe(mockDuplicates)
      expect(result.integrity).toBe(mockIntegrity)
      expect(result.recommendations).toContain('Remove 1 duplicate files to save 1 MB of space')
      expect(result.recommendations).toContain('Remove 1 corrupted files and consider re-downloading')
      expect(result.recommendations).toContain('1 files are missing and should be re-downloaded')
    })

    it('should provide positive feedback when no issues found', async () => {
      const mockDuplicates = {
        totalFiles: 100,
        duplicateGroups: new Map(),
        totalDuplicates: 0,
        potentialSpaceSaved: 0
      }

      const mockIntegrity = {
        totalFiles: 100,
        validFiles: 100,
        corruptedFiles: [],
        missingFiles: [],
        errors: []
      }

      jest.spyOn(contentIntegrityService, 'detectDuplicates').mockResolvedValue(mockDuplicates)
      jest.spyOn(contentIntegrityService, 'verifyAllContentIntegrity').mockResolvedValue(mockIntegrity)

      const result = await contentIntegrityService.generateContentHealthReport()

      expect(result.recommendations).toEqual(['Your content library is in excellent condition!'])
    })
  })

  describe('quickHealthCheck', () => {
    it('should perform quick health assessment', async () => {
      const mockDuplicates = new Map([
        ['hash1', ['/file1.jpg', '/file1_copy.jpg']]
      ])

      const mockIntegrity = {
        totalFiles: 100,
        validFiles: 98,
        corruptedFiles: ['/corrupted.jpg'],
        missingFiles: ['/missing.jpg'],
        errors: []
      }

      mockFileSystemService.detectDuplicateFiles.mockResolvedValue(mockDuplicates)
      jest.spyOn(contentIntegrityService, 'verifyAllContentIntegrity').mockResolvedValue(mockIntegrity)

      const result = await contentIntegrityService.quickHealthCheck()

      expect(result.hasIssues).toBe(true)
      expect(result.duplicateCount).toBe(1)
      expect(result.corruptedCount).toBe(1)
      expect(result.missingCount).toBe(1)
    })

    it('should report no issues when content is healthy', async () => {
      const mockDuplicates = new Map()
      const mockIntegrity = {
        totalFiles: 100,
        validFiles: 100,
        corruptedFiles: [],
        missingFiles: [],
        errors: []
      }

      mockFileSystemService.detectDuplicateFiles.mockResolvedValue(mockDuplicates)
      jest.spyOn(contentIntegrityService, 'verifyAllContentIntegrity').mockResolvedValue(mockIntegrity)

      const result = await contentIntegrityService.quickHealthCheck()

      expect(result.hasIssues).toBe(false)
      expect(result.duplicateCount).toBe(0)
      expect(result.corruptedCount).toBe(0)
      expect(result.missingCount).toBe(0)
    })
  })
})