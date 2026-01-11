import { promises as fs } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app } from 'electron'
import { Series, Chapter } from '../types'

export class FileSystemService {
  private readonly downloadsPath: string

  constructor() {
    // Use a dedicated downloads folder within userData
    const userDataPath = app?.getPath('userData') || path.join(process.cwd(), 'data')
    this.downloadsPath = path.join(userDataPath, 'downloads')
  }

  /**
   * Initialize the downloads directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.downloadsPath, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to initialize downloads directory: ${error}`)
    }
  }

  /**
   * Create organized directory structure for a series
   * Format: downloads/{sanitized-series-title}/
   */
  async createSeriesDirectory(series: Series): Promise<string> {
    try {
      const sanitizedTitle = this.sanitizeFileName(series.title)
      const seriesPath = path.join(this.downloadsPath, sanitizedTitle)
      
      await fs.mkdir(seriesPath, { recursive: true })
      
      // Create a metadata file for the series
      const metadataPath = path.join(seriesPath, 'series-info.json')
      const metadata = {
        id: series.id,
        title: series.title,
        author: series.author,
        synopsis: series.synopsis,
        totalChapters: series.totalChapters,
        downloadedAt: new Date().toISOString()
      }
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      
      return seriesPath
    } catch (error) {
      throw new Error(`Failed to create series directory: ${error}`)
    }
  }

  /**
   * Create organized directory structure for a chapter
   * Format: downloads/{sanitized-series-title}/Chapter-{number}-{sanitized-title}/
   */
  async createChapterDirectory(series: Series, chapter: Chapter): Promise<string> {
    try {
      const seriesPath = await this.getSeriesPath(series)
      const sanitizedChapterTitle = this.sanitizeFileName(chapter.title)
      const chapterDirName = `Chapter-${chapter.chapterNumber.toString().padStart(3, '0')}-${sanitizedChapterTitle}`
      const chapterPath = path.join(seriesPath, chapterDirName)
      
      await fs.mkdir(chapterPath, { recursive: true })
      
      // Create a metadata file for the chapter
      const metadataPath = path.join(chapterPath, 'chapter-info.json')
      const metadata = {
        id: chapter.id,
        seriesId: chapter.seriesId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        pageCount: chapter.pageCount,
        publishDate: chapter.publishDate.toISOString(),
        downloadedAt: new Date().toISOString()
      }
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      
      return chapterPath
    } catch (error) {
      throw new Error(`Failed to create chapter directory: ${error}`)
    }
  }

  /**
   * Get the path for a series directory
   */
  async getSeriesPath(series: Series): Promise<string> {
    const sanitizedTitle = this.sanitizeFileName(series.title)
    const seriesPath = path.join(this.downloadsPath, sanitizedTitle)
    
    // Ensure the directory exists
    await fs.mkdir(seriesPath, { recursive: true })
    
    return seriesPath
  }

  /**
   * Get the path for a chapter directory
   */
  async getChapterPath(series: Series, chapter: Chapter): Promise<string> {
    const seriesPath = await this.getSeriesPath(series)
    const sanitizedChapterTitle = this.sanitizeFileName(chapter.title)
    const chapterDirName = `Chapter-${chapter.chapterNumber.toString().padStart(3, '0')}-${sanitizedChapterTitle}`
    
    return path.join(seriesPath, chapterDirName)
  }

  /**
   * Generate file path for a manga page image
   */
  getPageFilePath(chapterPath: string, pageNumber: number, extension: string = 'jpg'): string {
    const paddedPageNumber = pageNumber.toString().padStart(3, '0')
    return path.join(chapterPath, `page-${paddedPageNumber}.${extension}`)
  }

  /**
   * Delete a series directory and all its contents
   */
  async deleteSeriesDirectory(series: Series): Promise<void> {
    try {
      const seriesPath = await this.getSeriesPath(series)
      await fs.rm(seriesPath, { recursive: true, force: true })
    } catch (error) {
      throw new Error(`Failed to delete series directory: ${error}`)
    }
  }

  /**
   * Delete a chapter directory and all its contents
   */
  async deleteChapterDirectory(series: Series, chapter: Chapter): Promise<void> {
    try {
      const chapterPath = await this.getChapterPath(series, chapter)
      await fs.rm(chapterPath, { recursive: true, force: true })
    } catch (error) {
      throw new Error(`Failed to delete chapter directory: ${error}`)
    }
  }

  /**
   * List all downloaded series directories
   */
  async getDownloadedSeries(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.downloadsPath, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    } catch (error) {
      return [] // Return empty array if downloads directory doesn't exist yet
    }
  }

  /**
   * List all chapter directories for a series
   */
  async getDownloadedChapters(series: Series): Promise<string[]> {
    try {
      const seriesPath = await this.getSeriesPath(series)
      const entries = await fs.readdir(seriesPath, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('Chapter-'))
        .map(entry => entry.name)
        .sort() // Sort chapters numerically
    } catch (error) {
      return [] // Return empty array if series directory doesn't exist
    }
  }

  /**
   * Check if a chapter is downloaded
   */
  async isChapterDownloaded(series: Series, chapter: Chapter): Promise<boolean> {
    try {
      const chapterPath = await this.getChapterPath(series, chapter)
      await fs.access(chapterPath)
      
      // Check if chapter has any page files
      const entries = await fs.readdir(chapterPath)
      const pageFiles = entries.filter(file => file.startsWith('page-') && 
        (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')))
      
      return pageFiles.length > 0
    } catch {
      return false
    }
  }

  /**
   * Get total size of downloaded content for a series
   */
  async getSeriesSize(series: Series): Promise<number> {
    try {
      const seriesPath = await this.getSeriesPath(series)
      return await this.getDirectorySize(seriesPath)
    } catch {
      return 0
    }
  }

  /**
   * Get total size of all downloaded content
   */
  async getTotalDownloadSize(): Promise<number> {
    try {
      return await this.getDirectorySize(this.downloadsPath)
    } catch {
      return 0
    }
  }

  /**
   * Detect and list duplicate files across the downloads directory using content hashing
   */
  async detectDuplicateFiles(): Promise<Map<string, string[]>> {
    const duplicates = new Map<string, string[]>()
    const fileHashes = new Map<string, string[]>()
    
    try {
      await this.scanForDuplicates(this.downloadsPath, fileHashes)
      
      // Find files with the same hash (duplicates)
      fileHashes.forEach((files, hash) => {
        if (files.length > 1) {
          duplicates.set(hash, files)
        }
      })
    } catch (error) {
      console.error('Error detecting duplicates:', error)
    }
    
    return duplicates
  }

  /**
   * Verify file integrity by checking file existence, readability, and content
   */
  async verifyFileIntegrity(filePath: string): Promise<{
    exists: boolean
    readable: boolean
    size: number
    isCorrupted: boolean
    error?: string
  }> {
    const result = {
      exists: false,
      readable: false,
      size: 0,
      isCorrupted: false,
      error: undefined as string | undefined
    }

    try {
      // Check if file exists
      await fs.access(filePath)
      result.exists = true

      // Check if file is readable
      await fs.access(filePath, fs.constants.R_OK)
      result.readable = true

      // Get file stats
      const stats = await fs.stat(filePath)
      result.size = stats.size

      // Check if file is empty (corrupted)
      if (stats.size === 0) {
        result.isCorrupted = true
        result.error = 'File is empty'
        return result
      }

      // For image files, perform additional validation
      if (this.isImageFile(filePath)) {
        const isValidImage = await this.validateImageFile(filePath)
        if (!isValidImage) {
          result.isCorrupted = true
          result.error = 'Invalid image file format'
        }
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      if (result.error.includes('ENOENT')) {
        result.exists = false
      } else if (result.error.includes('EACCES')) {
        result.readable = false
      }
    }

    return result
  }

  /**
   * Verify integrity of all files in a chapter directory
   */
  async verifyChapterIntegrity(series: Series, chapter: Chapter): Promise<{
    totalFiles: number
    validFiles: number
    corruptedFiles: string[]
    missingFiles: string[]
  }> {
    const result = {
      totalFiles: 0,
      validFiles: 0,
      corruptedFiles: [] as string[],
      missingFiles: [] as string[]
    }

    try {
      const chapterPath = await this.getChapterPath(series, chapter)
      
      // Check if chapter directory exists
      try {
        await fs.access(chapterPath)
      } catch {
        result.missingFiles.push(chapterPath)
        return result
      }

      // Get all image files in the chapter directory
      const entries = await fs.readdir(chapterPath)
      const imageFiles = entries.filter(file => 
        this.isImageFile(file) && file.startsWith('page-')
      )

      result.totalFiles = imageFiles.length

      // Verify each image file
      for (const imageFile of imageFiles) {
        const filePath = path.join(chapterPath, imageFile)
        const integrity = await this.verifyFileIntegrity(filePath)

        if (!integrity.exists) {
          result.missingFiles.push(filePath)
        } else if (integrity.isCorrupted) {
          result.corruptedFiles.push(filePath)
        } else {
          result.validFiles++
        }
      }

    } catch (error) {
      console.error('Error verifying chapter integrity:', error)
    }

    return result
  }

  /**
   * Verify integrity of all files in a series directory
   */
  async verifySeriesIntegrity(series: Series): Promise<{
    totalChapters: number
    validChapters: number
    corruptedChapters: string[]
    missingChapters: string[]
    fileIntegrityResults: Map<string, any>
  }> {
    const result = {
      totalChapters: 0,
      validChapters: 0,
      corruptedChapters: [] as string[],
      missingChapters: [] as string[],
      fileIntegrityResults: new Map()
    }

    try {
      const seriesPath = await this.getSeriesPath(series)
      
      // Check if series directory exists
      try {
        await fs.access(seriesPath)
      } catch {
        result.missingChapters.push(seriesPath)
        return result
      }

      // Get all chapter directories
      const chapterDirs = await this.getDownloadedChapters(series)
      result.totalChapters = chapterDirs.length

      // Verify each chapter
      for (const chapterDir of chapterDirs) {
        // Extract chapter number from directory name
        const chapterMatch = chapterDir.match(/Chapter-(\d+)/)
        if (!chapterMatch) continue

        const chapterNumber = parseInt(chapterMatch[1])
        const chapter: Chapter = {
          id: `${series.id}-chapter-${chapterNumber}`,
          seriesId: series.id,
          chapterNumber,
          title: `Chapter ${chapterNumber}`,
          pageCount: 0,
          publishDate: new Date(),
          isDownloaded: true,
          sourceUrl: ''
        }

        const chapterIntegrity = await this.verifyChapterIntegrity(series, chapter)
        result.fileIntegrityResults.set(chapterDir, chapterIntegrity)

        if (chapterIntegrity.missingFiles.length > 0) {
          result.missingChapters.push(chapterDir)
        } else if (chapterIntegrity.corruptedFiles.length > 0) {
          result.corruptedChapters.push(chapterDir)
        } else if (chapterIntegrity.validFiles > 0) {
          result.validChapters++
        }
      }

    } catch (error) {
      console.error('Error verifying series integrity:', error)
    }

    return result
  }

  /**
   * Calculate MD5 hash of a file for duplicate detection
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath)
      const hash = crypto.createHash('md5')
      hash.update(fileBuffer)
      return hash.digest('hex')
    } catch (error) {
      throw new Error(`Failed to calculate hash for ${filePath}: ${error}`)
    }
  }

  /**
   * Remove duplicate files, keeping the first occurrence
   */
  async removeDuplicateFiles(duplicates: Map<string, string[]>): Promise<{
    removedFiles: string[]
    errors: string[]
  }> {
    const result = {
      removedFiles: [] as string[],
      errors: [] as string[]
    }

    for (const [hash, files] of duplicates) {
      // Keep the first file, remove the rest
      const filesToRemove = files.slice(1)
      
      for (const filePath of filesToRemove) {
        try {
          await fs.unlink(filePath)
          result.removedFiles.push(filePath)
        } catch (error) {
          const errorMsg = `Failed to remove ${filePath}: ${error}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
    }

    return result
  }

  /**
   * Remove corrupted files
   */
  async removeCorruptedFiles(corruptedFiles: string[]): Promise<{
    removedFiles: string[]
    errors: string[]
  }> {
    const result = {
      removedFiles: [] as string[],
      errors: [] as string[]
    }

    for (const filePath of corruptedFiles) {
      try {
        await fs.unlink(filePath)
        result.removedFiles.push(filePath)
      } catch (error) {
        const errorMsg = `Failed to remove corrupted file ${filePath}: ${error}`
        result.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return result
  }

  /**
   * Get the downloads directory path
   */
  getDownloadsPath(): string {
    return this.downloadsPath
  }

  // Private helper methods

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*!]/g, '') // Remove invalid characters including exclamation mark
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100) // Limit length to 100 characters
  }

  /**
   * Calculate directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath)
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.error(`Error calculating directory size for ${dirPath}:`, error)
    }
    
    return totalSize
  }

  /**
   * Recursively scan directory for duplicate files using content hashing
   */
  private async scanForDuplicates(dirPath: string, fileHashes: Map<string, string[]>): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          await this.scanForDuplicates(fullPath, fileHashes)
        } else if (entry.isFile() && this.isImageFile(entry.name)) {
          try {
            // Use actual file content hash for accurate duplicate detection
            const hash = await this.calculateFileHash(fullPath)
            
            if (!fileHashes.has(hash)) {
              fileHashes.set(hash, [])
            }
            fileHashes.get(hash)!.push(fullPath)
          } catch (error) {
            console.error(`Error hashing file ${fullPath}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error)
    }
  }

  /**
   * Validate if an image file is properly formatted
   */
  private async validateImageFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath, { encoding: null })
      
      // Check for common image file signatures
      const signatures = {
        jpg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
        bmp: [0x42, 0x4D]
      }

      // Check if file starts with any valid image signature
      for (const [format, signature] of Object.entries(signatures)) {
        if (buffer.length >= signature.length) {
          const matches = signature.every((byte, index) => buffer[index] === byte)
          if (matches) {
            // For WebP, also check for WEBP signature at offset 8
            if (format === 'webp') {
              const webpSig = [0x57, 0x45, 0x42, 0x50] // "WEBP"
              if (buffer.length >= 12) {
                const webpMatches = webpSig.every((byte, index) => buffer[8 + index] === byte)
                return webpMatches
              }
              return false
            }
            return true
          }
        }
      }

      return false
    } catch (error) {
      console.error(`Error validating image file ${filePath}:`, error)
      return false
    }
  }

  /**
   * Check if file is an image file
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
    const extension = path.extname(fileName).toLowerCase()
    return imageExtensions.includes(extension)
  }
}