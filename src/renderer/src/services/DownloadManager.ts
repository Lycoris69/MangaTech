import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import * as path from 'path'
import { DownloadTask, Series, Chapter, PageUrl } from '../types'
import { StorageService } from './StorageService'
import { FileSystemService } from './FileSystemService'
import { ScraperManager } from './ScraperManager'

// Download progress event data
export interface DownloadProgress {
  taskId: string
  seriesId: string
  chapterId?: string
  progress: number
  totalPages?: number
  currentPage?: number
  estimatedTimeRemaining: number
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  error?: string
}

// Download options
export interface DownloadOptions {
  quality: 'high' | 'medium' | 'low'
  overwriteExisting: boolean
  resumeIncomplete: boolean
}

// Download manager events
export interface DownloadManagerEvents {
  'progress': (progress: DownloadProgress) => void
  'taskCompleted': (taskId: string) => void
  'taskFailed': (taskId: string, error: string) => void
  'queueUpdated': (queueLength: number) => void
}

export class DownloadManager extends EventEmitter {
  private storageService: StorageService
  private fileSystemService: FileSystemService
  private scraperManager: ScraperManager
  private downloadTasks: Map<string, DownloadTask> = new Map()
  private activeDownloads: Map<string, AbortController> = new Map()
  private isProcessing = false
  private maxConcurrentDownloads = 3
  private downloadOptions: DownloadOptions = {
    quality: 'high',
    overwriteExisting: false,
    resumeIncomplete: true
  }

  constructor(
    storageService: StorageService,
    fileSystemService: FileSystemService,
    scraperManager: ScraperManager
  ) {
    super()
    this.storageService = storageService
    this.fileSystemService = fileSystemService
    this.scraperManager = scraperManager
  }

  /**
   * Initialize the download manager and load existing tasks
   */
  async initialize(): Promise<void> {
    try {
      const tasks = await this.storageService.loadDownloadTasks()

      // Load tasks into memory and resume incomplete ones
      for (const task of tasks) {
        // Resume incomplete downloads if enabled
        if (this.downloadOptions.resumeIncomplete &&
          task.status === 'downloading') {
          task.status = 'pending' // Reset downloading tasks to pending for retry
        }

        this.downloadTasks.set(task.id, task)
      }

      // Start processing queue if there are pending tasks
      if (this.hasQueuedTasks()) {
        // Use setTimeout to allow initialization to complete first
        setTimeout(() => this.processQueue(), 0)
      }
    } catch (error) {
      throw new Error(`Failed to initialize download manager: ${error}`)
    }
  }

  /**
   * Download complete series (all chapters)
   */
  async downloadCompleteSeries(series: Series, options?: Partial<DownloadOptions>): Promise<string> {
    try {
      // Get series details to ensure we have all chapters
      const seriesDetails = await this.scraperManager.getSeriesDetails(series.id)

      // Create chapter list - for now we'll simulate chapter data
      // In a real implementation, this would come from the scraper
      const chapters: Chapter[] = []
      for (let i = 1; i <= seriesDetails.totalChapters; i++) {
        chapters.push({
          id: `${series.id}-chapter-${i}`,
          seriesId: series.id,
          chapterNumber: i,
          title: `Chapter ${i}`,
          pageCount: 20, // Default page count
          publishDate: new Date(),
          isDownloaded: false,
          sourceUrl: `${series.sourceUrl}/chapter-${i}`
        })
      }

      const chapterIds = chapters.map(c => c.id)
      return await this.createDownloadTask(series, chapterIds, { ...this.downloadOptions, ...options })
    } catch (error) {
      throw new Error(`Failed to create complete series download: ${error}`)
    }
  }

  /**
   * Download selected chapters
   */
  async downloadSelectedChapters(
    series: Series,
    chapterIds: string[],
    options?: Partial<DownloadOptions>
  ): Promise<string> {
    try {
      return await this.createDownloadTask(series, chapterIds, { ...this.downloadOptions, ...options })
    } catch (error) {
      throw new Error(`Failed to create selective download: ${error}`)
    }
  }

  /**
   * Create a new download task
   */
  private async createDownloadTask(
    series: Series,
    chapterIds: string[],
    options: DownloadOptions
  ): Promise<string> {
    const taskId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const seriesPath = await this.fileSystemService.getSeriesPath(series)

    const task: DownloadTask = {
      id: taskId,
      seriesId: series.id,
      chapterIds,
      status: 'pending',
      progress: 0,
      estimatedTimeRemaining: 0,
      downloadPath: seriesPath,
      createdAt: new Date()
    }

    this.downloadTasks.set(taskId, task)
    await this.saveDownloadTasks()

    this.emit('queueUpdated', this.getQueueLength())

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return taskId
  }

  /**
   * Process the download queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      while (this.hasQueuedTasks() && this.activeDownloads.size < this.maxConcurrentDownloads) {
        const task = this.getNextQueuedTask()
        if (task) {
          this.processDownloadTask(task)
        }
      }
    } finally {
      // Check if we should continue processing
      setTimeout(() => {
        if (this.hasQueuedTasks() && this.activeDownloads.size < this.maxConcurrentDownloads) {
          this.processQueue()
        } else if (this.activeDownloads.size === 0) {
          this.isProcessing = false
        }
      }, 1000)
    }
  }

  /**
   * Process a single download task
   */
  private async processDownloadTask(task: DownloadTask): Promise<void> {
    const abortController = new AbortController()
    this.activeDownloads.set(task.id, abortController)

    try {
      task.status = 'downloading'
      await this.saveDownloadTasks()

      const series = await this.storageService.getSeriesById(task.seriesId)
      if (!series) {
        throw new Error(`Series not found: ${task.seriesId}`)
      }

      // Create series directory
      await this.fileSystemService.createSeriesDirectory(series)

      let completedChapters = 0
      const totalChapters = task.chapterIds.length
      const startTime = Date.now()

      for (const chapterId of task.chapterIds) {
        if (abortController.signal.aborted) {
          throw new Error('Download cancelled')
        }

        try {
          await this.downloadChapter(series, chapterId, task.id, abortController.signal)
          completedChapters++

          // Update progress
          const progress = (completedChapters / totalChapters) * 100
          const elapsedTime = Date.now() - startTime
          const estimatedTotal = (elapsedTime / completedChapters) * totalChapters
          const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsedTime)

          task.progress = progress
          task.estimatedTimeRemaining = estimatedTimeRemaining

          this.emit('progress', {
            taskId: task.id,
            seriesId: task.seriesId,
            chapterId,
            progress,
            estimatedTimeRemaining,
            status: 'downloading'
          })

          await this.saveDownloadTasks()
        } catch (error) {
          console.error(`Failed to download chapter ${chapterId}:`, error)
          // Continue with other chapters instead of failing the entire task
        }
      }

      // Mark task as completed
      task.status = 'completed'
      task.progress = 100
      task.estimatedTimeRemaining = 0
      task.completedAt = new Date()

      await this.saveDownloadTasks()
      this.emit('taskCompleted', task.id)

    } catch (error) {
      task.status = 'failed'
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.saveDownloadTasks()
      this.emit('taskFailed', task.id, errorMessage)

    } finally {
      this.activeDownloads.delete(task.id)

      // Continue processing queue
      if (this.hasQueuedTasks()) {
        setTimeout(() => this.processQueue(), 1000)
      } else if (this.activeDownloads.size === 0) {
        this.isProcessing = false
      }
    }
  }

  /**
   * Download a single chapter
   */
  private async downloadChapter(
    series: Series,
    chapterId: string,
    taskId: string,
    signal: AbortSignal
  ): Promise<void> {
    try {
      // Create chapter object - in real implementation this would come from storage/scraper
      const chapter: Chapter = {
        id: chapterId,
        seriesId: series.id,
        chapterNumber: parseInt(chapterId.split('-').pop() || '1'),
        title: `Chapter ${chapterId.split('-').pop()}`,
        pageCount: 20,
        publishDate: new Date(),
        isDownloaded: false,
        sourceUrl: `${series.sourceUrl}/${chapterId}`
      }

      // Check if chapter is already downloaded and we're not overwriting
      if (!this.downloadOptions.overwriteExisting) {
        const isDownloaded = await this.fileSystemService.isChapterDownloaded(series, chapter)
        if (isDownloaded) {
          return // Skip already downloaded chapter
        }
      }

      // Create chapter directory
      const chapterPath = await this.fileSystemService.createChapterDirectory(series, chapter)

      // Get chapter pages from scraper
      const pages = await this.scraperManager.getChapterPages(chapterId)

      // Download each page
      for (let i = 0; i < pages.length; i++) {
        if (signal.aborted) {
          throw new Error('Download cancelled')
        }

        const page = pages[i]
        const pageFilePath = this.fileSystemService.getPageFilePath(
          chapterPath,
          page.pageNumber,
          this.getImageExtension(page.imageUrl)
        )

        // Check if page already exists and we're resuming
        if (this.downloadOptions.resumeIncomplete) {
          try {
            await fs.access(pageFilePath)
            continue // Skip existing page
          } catch {
            // Page doesn't exist, continue with download
          }
        }

        await this.downloadImage(page.imageUrl, pageFilePath, signal)

        // Emit page progress
        this.emit('progress', {
          taskId,
          seriesId: series.id,
          chapterId,
          progress: ((i + 1) / pages.length) * 100,
          totalPages: pages.length,
          currentPage: i + 1,
          estimatedTimeRemaining: 0,
          status: 'downloading'
        })
      }

      // Mark chapter as downloaded
      chapter.isDownloaded = true
      chapter.localPath = chapterPath

    } catch (error) {
      throw new Error(`Failed to download chapter ${chapterId}: ${error}`)
    }
  }

  /**
   * Download a single image file
   */
  private async downloadImage(imageUrl: string, filePath: string, signal: AbortSignal): Promise<void> {
    try {
      const response = await fetch(imageUrl, { signal })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()

      // Ensure directory exists before writing file
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(filePath, Buffer.from(buffer))

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled')
      }
      throw new Error(`Failed to download image ${imageUrl}: ${error}`)
    }
  }

  /**
   * Get image file extension from URL
   */
  private getImageExtension(imageUrl: string): string {
    const url = new URL(imageUrl)
    const pathname = url.pathname
    const extension = path.extname(pathname).toLowerCase()

    // Default to jpg if no extension or unknown extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    return validExtensions.includes(extension) ? extension.substring(1) : 'jpg'
  }

  /**
   * Pause a download task
   */
  async pauseDownload(taskId: string): Promise<void> {
    const task = this.downloadTasks.get(taskId)
    if (!task) {
      throw new Error(`Download task not found: ${taskId}`)
    }

    const abortController = this.activeDownloads.get(taskId)
    if (abortController) {
      abortController.abort()
      this.activeDownloads.delete(taskId)
    }

    task.status = 'pending' // Will be resumed when queue is processed
    await this.saveDownloadTasks()
  }

  /**
   * Cancel a download task
   */
  async cancelDownload(taskId: string): Promise<void> {
    const task = this.downloadTasks.get(taskId)
    if (!task) {
      throw new Error(`Download task not found: ${taskId}`)
    }

    const abortController = this.activeDownloads.get(taskId)
    if (abortController) {
      abortController.abort()
      this.activeDownloads.delete(taskId)
    }

    task.status = 'failed'
    await this.saveDownloadTasks()

    this.downloadTasks.delete(taskId)
    this.emit('queueUpdated', this.getQueueLength())
  }

  /**
   * Retry a failed download
   */
  async retryDownload(taskId: string): Promise<void> {
    const task = this.downloadTasks.get(taskId)
    if (!task) {
      throw new Error(`Download task not found: ${taskId}`)
    }

    task.status = 'pending'
    task.progress = 0
    task.estimatedTimeRemaining = 0

    await this.saveDownloadTasks()
    this.emit('queueUpdated', this.getQueueLength())

    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Get all download tasks
   */
  getDownloadTasks(): DownloadTask[] {
    return Array.from(this.downloadTasks.values())
  }

  /**
   * Get download task by ID
   */
  getDownloadTask(taskId: string): DownloadTask | undefined {
    return this.downloadTasks.get(taskId)
  }

  /**
   * Get queue length (pending tasks)
   */
  getQueueLength(): number {
    return Array.from(this.downloadTasks.values())
      .filter(task => task.status === 'pending').length
  }

  /**
   * Get active downloads count
   */
  getActiveDownloadsCount(): number {
    return this.activeDownloads.size
  }

  /**
   * Set download options
   */
  setDownloadOptions(options: Partial<DownloadOptions>): void {
    this.downloadOptions = { ...this.downloadOptions, ...options }
  }

  /**
   * Set maximum concurrent downloads
   */
  setMaxConcurrentDownloads(max: number): void {
    this.maxConcurrentDownloads = Math.max(1, Math.min(10, max))
  }

  // Private helper methods

  private hasQueuedTasks(): boolean {
    return Array.from(this.downloadTasks.values())
      .some(task => task.status === 'pending')
  }

  private getNextQueuedTask(): DownloadTask | null {
    return Array.from(this.downloadTasks.values())
      .find(task => task.status === 'pending') || null
  }

  private async saveDownloadTasks(): Promise<void> {
    const tasks = Array.from(this.downloadTasks.values())
    await this.storageService.saveDownloadTasks(tasks)
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Cancel all active downloads
    for (const [taskId, abortController] of this.activeDownloads) {
      abortController.abort()
    }
    this.activeDownloads.clear()

    // Save final state
    await this.saveDownloadTasks()
  }
}