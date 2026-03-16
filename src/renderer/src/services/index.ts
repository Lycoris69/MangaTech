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
import {
  Series,
  Chapter,
  SeriesSearchResult,
  UserLibrary,
  DownloadTask,
  SeriesDetails,
  TrendingContent,
  PageUrl,
  HotScan,
  LatestRelease
} from '../types'
import { SearchResponse } from './scraper/SearchInterface'
export { ManhwazScraper } from './scraper/ManhwazScraper'
export { ChapterExtractor } from './scraper/ChapterExtractor'
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
} from './scraper/SearchInterface'
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
export { ErrorHandler, errorHandler } from './scraper/ErrorHandler'
export type { ErrorContext, FailurePattern } from './scraper/ErrorHandler'
export { OperationLogger, operationLogger } from './scraper/OperationLogger'
export type { OperationMetrics, PerformanceMetrics } from './scraper/OperationLogger'
export { MetricsCollector, metricsCollector } from './scraper/MetricsCollector'
export type { ScrapingMetrics, AggregatedMetrics } from './scraper/MetricsCollector'
export { ScrapingMonitor, scrapingMonitor } from './scraper/ScrapingMonitor'
export type { MonitoredOperation, MonitoringResult } from './scraper/ScrapingMonitor'

// Caching and performance optimization services
export { ContentCacheService } from './scraper/ContentCacheService'
export type { CacheConfig, CacheStats } from './scraper/ContentCacheService'
export { PerformanceOptimizer } from './scraper/PerformanceOptimizer'
export type { PerformanceConfig } from './scraper/PerformanceOptimizer'

// Service interfaces for dependency injection and testing
export interface IStorageService {
  initialize(): Promise<void>
  saveUserLibrary(library: UserLibrary): Promise<void>
  loadUserLibrary(): Promise<UserLibrary>
  saveSeriesMetadata(series: Series[] | SeriesSearchResult[]): Promise<void>
  loadSeriesMetadata(): Promise<(Series | SeriesSearchResult)[]>
  saveDownloadTasks(tasks: DownloadTask[]): Promise<void>
  loadDownloadTasks(): Promise<DownloadTask[]>
  upsertSeries(series: Series | SeriesSearchResult): Promise<void>
  getSeriesById(seriesId: string): Promise<Series | SeriesSearchResult | null>
  deleteSeries(seriesId: string): Promise<void>
  verifyFileIntegrity(filePath: string): Promise<boolean>
  getUserDataPath(): string
}

export interface IFileSystemService {
  initialize(): Promise<void>
  createSeriesDirectory(series: Series | SeriesSearchResult): Promise<string>
  createChapterDirectory(series: Series | SeriesSearchResult, chapter: Chapter): Promise<string>
  getSeriesPath(series: Series | SeriesSearchResult): Promise<string>
  getChapterPath(series: Series | SeriesSearchResult, chapter: Chapter): Promise<string>
  getPageFilePath(chapterPath: string, pageNumber: number, extension?: string): string
  deleteSeriesDirectory(series: Series | SeriesSearchResult): Promise<void>
  deleteChapterDirectory(series: Series | SeriesSearchResult, chapter: Chapter): Promise<void>
  getDownloadedSeries(): Promise<string[]>
  getDownloadedChapters(series: Series | SeriesSearchResult): Promise<string[]>
  isChapterDownloaded(series: Series | SeriesSearchResult, chapter: Chapter): Promise<boolean>
  getSeriesSize(series: Series | SeriesSearchResult): Promise<number>
  getTotalDownloadSize(): Promise<number>
  detectDuplicateFiles(): Promise<Map<string, string[]>>
  verifyFileIntegrity(filePath: string): Promise<unknown>
  verifyChapterIntegrity(series: Series | SeriesSearchResult, chapter: Chapter): Promise<unknown>
  verifySeriesIntegrity(series: Series | SeriesSearchResult): Promise<unknown>
  calculateFileHash(filePath: string): Promise<string>
  removeDuplicateFiles(duplicates: Map<string, string[]>): Promise<unknown>
  removeCorruptedFiles(corruptedFiles: string[]): Promise<unknown>
  getDownloadsPath(): string
}

export interface IWebScrapingService {
  searchSeries(query: string): Promise<SeriesSearchResult[]>
  getSeriesDetails(seriesId: string): Promise<SeriesDetails>
  getTrendingContent(): Promise<TrendingContent>
  getChapterPages(chapterId: string): Promise<PageUrl[]>
  validateSource(sourceUrl: string): Promise<boolean>
}

export interface IScraperManager {
  getAvailableSources(): string[]
  searchSeries(query: string): Promise<SeriesSearchResult[]>
  getSeriesDetails(seriesId: string): Promise<SeriesDetails>
  getTrendingContent(): Promise<TrendingContent>
  getChapterPages(chapterId: string): Promise<PageUrl[]>
  validateSource(sourceUrl: string): Promise<boolean>
  addSource(config: unknown): void
  removeSource(sourceName: string): void
  cleanup(): Promise<void>
}

export interface ISearchService {
  searchSeries(query: string): Promise<SearchResponse>
  getTrendingContent(): Promise<TrendingContent | { hotScans: HotScan[], latestReleases: LatestRelease[] }>
  clearCache(): void
  getCacheStats(): { size: number; maxSize: number; hitRate?: number }
}

export interface IDownloadManager {
  initialize(): Promise<void>
  downloadCompleteSeries(series: Series | SeriesSearchResult, options?: unknown): Promise<string>
  downloadSelectedChapters(series: Series | SeriesSearchResult, chapterIds: string[], options?: unknown): Promise<string>
  pauseDownload(taskId: string): Promise<void>
  cancelDownload(taskId: string): Promise<void>
  retryDownload(taskId: string): Promise<void>
  getDownloadTasks(): DownloadTask[]
  getDownloadTask(taskId: string): DownloadTask | undefined
  getQueueLength(): number
  getActiveDownloadsCount(): number
  setDownloadOptions(options: unknown): void
  setMaxConcurrentDownloads(max: number): void
  cleanup(): Promise<void>
}

export interface IContentIntegrityService {
  detectDuplicates(): Promise<unknown>
  verifyAllContentIntegrity(): Promise<unknown>
  verifySeriesIntegrity(series: Series | SeriesSearchResult): Promise<unknown>
  resolveContentIssues(duplicates: unknown, integrity: unknown, options: unknown): Promise<unknown>
  generateContentHealthReport(): Promise<unknown>
  quickHealthCheck(): Promise<unknown>
}