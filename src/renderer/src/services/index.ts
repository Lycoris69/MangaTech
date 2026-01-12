// Export all services for easy importing
export { StorageService } from './StorageService'
export { FileSystemService } from './FileSystemService'
export {
  BaseScraper,
  ScrapingError,
  RateLimitError,
  ValidationError
} from './WebScrapingService'
export type { WebScrapingService } from './WebScrapingService'
export { ManhwazScraper } from './ManhwazScraper'
export { ChapterExtractor } from './ChapterExtractor'
export { ScraperManager } from './ScraperManager'
export {
  SearchService,
  type ContentType,
  type CategorizedSearchResult,
  type CategorizedSearchResults
} from './SearchService'
export {
  SearchInterface,
  type SearchOptions,
  type AutocompleteResult,
  type SearchResponse
} from './SearchInterface'
export { LibraryService } from './LibraryService'

export {
  DownloadManager,
  type DownloadProgress,
  type DownloadOptions,
  type DownloadManagerEvents
} from './DownloadManager'
export {
  ContentIntegrityService,
  type DuplicateDetectionResult,
  type FileIntegrityResult,
  type SeriesIntegrityResult,
  type ResolutionOptions,
  type ResolutionResult,
  type ContentIntegrityEvents
} from './ContentIntegrityService'
export { OnlineReadingService } from './OnlineReadingService'
export { ReadingStateService } from './ReadingStateService'
export { ModeManager, modeManager } from './ModeManager'
export type { AppMode, ModeContext, ModeTransition } from './ModeManager'

// Error handling and monitoring services
export { ErrorHandler, errorHandler } from './ErrorHandler'
export type { ErrorContext, FailurePattern } from './ErrorHandler'
export { OperationLogger, operationLogger } from './OperationLogger'
export type { OperationMetrics, PerformanceMetrics } from './OperationLogger'
export { MetricsCollector, metricsCollector } from './MetricsCollector'
export type { ScrapingMetrics, AggregatedMetrics } from './MetricsCollector'
export { ScrapingMonitor, scrapingMonitor } from './ScrapingMonitor'
export type { MonitoredOperation, MonitoringResult } from './ScrapingMonitor'

// Caching and performance optimization services
export { ContentCacheService } from './ContentCacheService'
export type { CacheConfig, CacheStats } from './ContentCacheService'
export { PerformanceOptimizer } from './PerformanceOptimizer'
export type { PerformanceConfig } from './PerformanceOptimizer'

// Service interfaces for dependency injection and testing
export interface IStorageService {
  initialize(): Promise<void>
  saveUserLibrary(library: any): Promise<void>
  loadUserLibrary(): Promise<any>
  saveSeriesMetadata(series: any[]): Promise<void>
  loadSeriesMetadata(): Promise<any[]>
  saveDownloadTasks(tasks: any[]): Promise<void>
  loadDownloadTasks(): Promise<any[]>
  upsertSeries(series: any): Promise<void>
  getSeriesById(seriesId: string): Promise<any | null>
  deleteSeries(seriesId: string): Promise<void>
  verifyFileIntegrity(filePath: string): Promise<boolean>
  getUserDataPath(): string
}

export interface IFileSystemService {
  initialize(): Promise<void>
  createSeriesDirectory(series: any): Promise<string>
  createChapterDirectory(series: any, chapter: any): Promise<string>
  getSeriesPath(series: any): Promise<string>
  getChapterPath(series: any, chapter: any): Promise<string>
  getPageFilePath(chapterPath: string, pageNumber: number, extension?: string): string
  deleteSeriesDirectory(series: any): Promise<void>
  deleteChapterDirectory(series: any, chapter: any): Promise<void>
  getDownloadedSeries(): Promise<string[]>
  getDownloadedChapters(series: any): Promise<string[]>
  isChapterDownloaded(series: any, chapter: any): Promise<boolean>
  getSeriesSize(series: any): Promise<number>
  getTotalDownloadSize(): Promise<number>
  detectDuplicateFiles(): Promise<Map<string, string[]>>
  verifyFileIntegrity(filePath: string): Promise<any>
  verifyChapterIntegrity(series: any, chapter: any): Promise<any>
  verifySeriesIntegrity(series: any): Promise<any>
  calculateFileHash(filePath: string): Promise<string>
  removeDuplicateFiles(duplicates: Map<string, string[]>): Promise<any>
  removeCorruptedFiles(corruptedFiles: string[]): Promise<any>
  getDownloadsPath(): string
}

export interface IWebScrapingService {
  searchSeries(query: string): Promise<any[]>
  getSeriesDetails(seriesId: string): Promise<any>
  getTrendingContent(): Promise<any>
  getChapterPages(chapterId: string): Promise<any[]>
  validateSource(sourceUrl: string): Promise<boolean>
}

export interface IScraperManager {
  getAvailableSources(): string[]
  searchSeries(query: string): Promise<any[]>
  getSeriesDetails(seriesId: string): Promise<any>
  getTrendingContent(): Promise<any>
  getChapterPages(chapterId: string): Promise<any[]>
  validateSource(sourceUrl: string): Promise<boolean>
  addSource(config: any): void
  removeSource(sourceName: string): void
  cleanup(): Promise<void>
}

export interface ISearchService {
  searchSeries(query: string): Promise<any>
  getTrendingContent(): Promise<any>
  clearCache(): void
  getCacheStats(): { size: number; maxSize: number; hitRate?: number }
}

export interface IDownloadManager {
  initialize(): Promise<void>
  downloadCompleteSeries(series: any, options?: any): Promise<string>
  downloadSelectedChapters(series: any, chapterIds: string[], options?: any): Promise<string>
  pauseDownload(taskId: string): Promise<void>
  cancelDownload(taskId: string): Promise<void>
  retryDownload(taskId: string): Promise<void>
  getDownloadTasks(): any[]
  getDownloadTask(taskId: string): any | undefined
  getQueueLength(): number
  getActiveDownloadsCount(): number
  setDownloadOptions(options: any): void
  setMaxConcurrentDownloads(max: number): void
  cleanup(): Promise<void>
}

export interface IContentIntegrityService {
  detectDuplicates(): Promise<any>
  verifyAllContentIntegrity(): Promise<any>
  verifySeriesIntegrity(series: any): Promise<any>
  resolveContentIssues(duplicates: any, integrity: any, options: any): Promise<any>
  generateContentHealthReport(): Promise<any>
  quickHealthCheck(): Promise<any>
}