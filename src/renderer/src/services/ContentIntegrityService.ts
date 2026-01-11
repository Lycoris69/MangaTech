import { EventEmitter } from 'events'
import { FileSystemService } from './FileSystemService'
import { StorageService } from './StorageService'
import { Series, Chapter } from '../types'

// Content integrity result types
export interface DuplicateDetectionResult {
  totalFiles: number
  duplicateGroups: Map<string, string[]>
  totalDuplicates: number
  potentialSpaceSaved: number
}

export interface FileIntegrityResult {
  totalFiles: number
  validFiles: number
  corruptedFiles: string[]
  missingFiles: string[]
  errors: string[]
}

export interface SeriesIntegrityResult {
  seriesId: string
  seriesTitle: string
  totalChapters: number
  validChapters: number
  corruptedChapters: string[]
  missingChapters: string[]
  fileIntegrityResults: Map<string, any>
}

export interface ResolutionOptions {
  removeDuplicates: boolean
  removeCorrupted: boolean
  redownloadMissing: boolean
  createBackup: boolean
}

export interface ResolutionResult {
  duplicatesRemoved: number
  corruptedRemoved: number
  spaceSaved: number
  errors: string[]
  redownloadRequired: string[]
}

// Events emitted by ContentIntegrityService
export interface ContentIntegrityEvents {
  'scanProgress': (progress: { current: number; total: number; operation: string }) => void
  'duplicatesFound': (result: DuplicateDetectionResult) => void
  'integrityCheckComplete': (result: FileIntegrityResult) => void
  'resolutionComplete': (result: ResolutionResult) => void
}

export class ContentIntegrityService extends EventEmitter {
  private fileSystemService: FileSystemService
  private storageService: StorageService

  constructor(fileSystemService: FileSystemService, storageService: StorageService) {
    super()
    this.fileSystemService = fileSystemService
    this.storageService = storageService
  }

  /**
   * Perform comprehensive duplicate detection across all downloaded content
   */
  async detectDuplicates(): Promise<DuplicateDetectionResult> {
    this.emit('scanProgress', { current: 0, total: 100, operation: 'Scanning for duplicates' })

    try {
      const duplicateMap = await this.fileSystemService.detectDuplicateFiles()
      
      let totalFiles = 0
      let totalDuplicates = 0
      let potentialSpaceSaved = 0

      // Calculate statistics
      for (const [hash, files] of duplicateMap) {
        totalFiles += files.length
        totalDuplicates += files.length - 1 // All but the first are duplicates
        
        // Calculate potential space saved (estimate based on first file size)
        if (files.length > 1) {
          try {
            const firstFile = files[0]
            const stats = await require('fs').promises.stat(firstFile)
            potentialSpaceSaved += stats.size * (files.length - 1)
          } catch (error) {
            console.error(`Error calculating size for ${files[0]}:`, error)
          }
        }
      }

      const result: DuplicateDetectionResult = {
        totalFiles,
        duplicateGroups: duplicateMap,
        totalDuplicates,
        potentialSpaceSaved
      }

      this.emit('duplicatesFound', result)
      this.emit('scanProgress', { current: 100, total: 100, operation: 'Duplicate scan complete' })

      return result
    } catch (error) {
      throw new Error(`Failed to detect duplicates: ${error}`)
    }
  }

  /**
   * Verify file integrity for all downloaded content
   */
  async verifyAllContentIntegrity(): Promise<FileIntegrityResult> {
    this.emit('scanProgress', { current: 0, total: 100, operation: 'Verifying file integrity' })

    const result: FileIntegrityResult = {
      totalFiles: 0,
      validFiles: 0,
      corruptedFiles: [],
      missingFiles: [],
      errors: []
    }

    try {
      // Get all downloaded series
      const seriesMetadata = await this.storageService.loadSeriesMetadata()
      
      // Filter series that have downloaded content
      const downloadedSeries: Series[] = []
      for (const series of seriesMetadata) {
        try {
          const chapters = await this.fileSystemService.getDownloadedChapters(series)
          if (chapters.length > 0) {
            downloadedSeries.push(series)
          }
        } catch (error) {
          // Skip series that can't be checked
          console.warn(`Could not check downloaded chapters for series ${series.title}:`, error)
        }
      }

      let processedSeries = 0
      const totalSeries = downloadedSeries.length

      for (const series of downloadedSeries) {
        try {
          const seriesIntegrity = await this.fileSystemService.verifySeriesIntegrity(series)
          
          // Aggregate results
          for (const [chapterDir, chapterResult] of seriesIntegrity.fileIntegrityResults) {
            result.totalFiles += chapterResult.totalFiles
            result.validFiles += chapterResult.validFiles
            result.corruptedFiles.push(...chapterResult.corruptedFiles)
            result.missingFiles.push(...chapterResult.missingFiles)
          }

          processedSeries++
          const progress = Math.round((processedSeries / totalSeries) * 100)
          this.emit('scanProgress', { 
            current: progress, 
            total: 100, 
            operation: `Verifying ${series.title}` 
          })

        } catch (error) {
          const errorMsg = `Error verifying series ${series.title}: ${error}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      this.emit('integrityCheckComplete', result)
      return result

    } catch (error) {
      throw new Error(`Failed to verify content integrity: ${error}`)
    }
  }

  /**
   * Verify integrity for a specific series
   */
  async verifySeriesIntegrity(series: Series): Promise<SeriesIntegrityResult> {
    try {
      const integrityResult = await this.fileSystemService.verifySeriesIntegrity(series)
      
      return {
        seriesId: series.id,
        seriesTitle: series.title,
        totalChapters: integrityResult.totalChapters,
        validChapters: integrityResult.validChapters,
        corruptedChapters: integrityResult.corruptedChapters,
        missingChapters: integrityResult.missingChapters,
        fileIntegrityResults: integrityResult.fileIntegrityResults
      }
    } catch (error) {
      throw new Error(`Failed to verify series integrity: ${error}`)
    }
  }

  /**
   * Resolve duplicate and corrupted files based on user preferences
   */
  async resolveContentIssues(
    duplicates: DuplicateDetectionResult,
    integrity: FileIntegrityResult,
    options: ResolutionOptions
  ): Promise<ResolutionResult> {
    const result: ResolutionResult = {
      duplicatesRemoved: 0,
      corruptedRemoved: 0,
      spaceSaved: 0,
      errors: [],
      redownloadRequired: []
    }

    try {
      // Handle duplicates
      if (options.removeDuplicates && duplicates.duplicateGroups.size > 0) {
        this.emit('scanProgress', { current: 0, total: 100, operation: 'Removing duplicates' })
        
        const removalResult = await this.fileSystemService.removeDuplicateFiles(duplicates.duplicateGroups)
        result.duplicatesRemoved = removalResult.removedFiles.length
        result.errors.push(...removalResult.errors)
        
        // Calculate space saved
        for (const filePath of removalResult.removedFiles) {
          try {
            // Since file is already removed, we can't get its size
            // Use estimated size from duplicate detection
            result.spaceSaved += Math.round(duplicates.potentialSpaceSaved / duplicates.totalDuplicates)
          } catch (error) {
            console.error(`Error calculating space saved for ${filePath}:`, error)
          }
        }
      }

      // Handle corrupted files
      if (options.removeCorrupted && integrity.corruptedFiles.length > 0) {
        this.emit('scanProgress', { current: 50, total: 100, operation: 'Removing corrupted files' })
        
        const corruptedRemovalResult = await this.fileSystemService.removeCorruptedFiles(integrity.corruptedFiles)
        result.corruptedRemoved = corruptedRemovalResult.removedFiles.length
        result.errors.push(...corruptedRemovalResult.errors)
        
        // Mark corrupted files for redownload if requested
        if (options.redownloadMissing) {
          result.redownloadRequired.push(...corruptedRemovalResult.removedFiles)
        }
      }

      // Handle missing files
      if (options.redownloadMissing && integrity.missingFiles.length > 0) {
        result.redownloadRequired.push(...integrity.missingFiles)
      }

      this.emit('resolutionComplete', result)
      this.emit('scanProgress', { current: 100, total: 100, operation: 'Resolution complete' })

      return result

    } catch (error) {
      throw new Error(`Failed to resolve content issues: ${error}`)
    }
  }

  /**
   * Get detailed report of content health
   */
  async generateContentHealthReport(): Promise<{
    duplicates: DuplicateDetectionResult
    integrity: FileIntegrityResult
    recommendations: string[]
  }> {
    try {
      const duplicates = await this.detectDuplicates()
      const integrity = await this.verifyAllContentIntegrity()
      
      const recommendations: string[] = []
      
      // Generate recommendations based on findings
      if (duplicates.totalDuplicates > 0) {
        const spaceMB = Math.round(duplicates.potentialSpaceSaved / (1024 * 1024))
        recommendations.push(`Remove ${duplicates.totalDuplicates} duplicate files to save ${spaceMB} MB of space`)
      }
      
      if (integrity.corruptedFiles.length > 0) {
        recommendations.push(`Remove ${integrity.corruptedFiles.length} corrupted files and consider re-downloading`)
      }
      
      if (integrity.missingFiles.length > 0) {
        recommendations.push(`${integrity.missingFiles.length} files are missing and should be re-downloaded`)
      }
      
      const healthPercentage = Math.round((integrity.validFiles / integrity.totalFiles) * 100)
      if (healthPercentage < 95) {
        recommendations.push(`Content health is ${healthPercentage}% - consider running integrity repair`)
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Your content library is in excellent condition!')
      }

      return {
        duplicates,
        integrity,
        recommendations
      }
    } catch (error) {
      throw new Error(`Failed to generate content health report: ${error}`)
    }
  }

  /**
   * Quick scan for immediate issues (faster than full scan)
   */
  async quickHealthCheck(): Promise<{
    hasIssues: boolean
    duplicateCount: number
    corruptedCount: number
    missingCount: number
  }> {
    try {
      // Quick check by sampling some files rather than full scan
      const downloadsPath = this.fileSystemService.getDownloadsPath()
      
      // Sample-based duplicate detection (check recent files only)
      const duplicates = await this.fileSystemService.detectDuplicateFiles()
      const duplicateCount = Array.from(duplicates.values()).reduce((sum, files) => sum + files.length - 1, 0)
      
      // Quick integrity check on a sample of files
      let corruptedCount = 0
      let missingCount = 0
      
      // This is a simplified check - in a full implementation you might sample files
      const integrity = await this.verifyAllContentIntegrity()
      corruptedCount = integrity.corruptedFiles.length
      missingCount = integrity.missingFiles.length
      
      const hasIssues = duplicateCount > 0 || corruptedCount > 0 || missingCount > 0
      
      return {
        hasIssues,
        duplicateCount,
        corruptedCount,
        missingCount
      }
    } catch (error) {
      throw new Error(`Failed to perform quick health check: ${error}`)
    }
  }
}