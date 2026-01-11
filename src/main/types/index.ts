// Core data models for MangaTech application

export interface Series {
  id: string
  title: string
  author: string
  synopsis: string
  coverImageUrl: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  rating: number
  totalChapters: number
  lastUpdated: Date
  sourceUrl: string
  chapters?: ChapterInfo[]
}

export interface Chapter {
  id: string
  seriesId: string
  chapterNumber: number
  title: string
  pageCount: number
  publishDate: Date
  isDownloaded: boolean
  localPath?: string
  sourceUrl: string
}

export interface FavoriteSeries {
  seriesId: string
  dateAdded: Date
  lastReadChapter?: string
  notificationsEnabled: boolean
}

export interface DownloadedSeries {
  seriesId: string
  downloadPath: string
  downloadDate: Date
  chapters: string[] // Array of chapter IDs
}

export interface ReadingProgress {
  seriesId: string
  chapterId: string
  pageNumber: number
  lastReadDate: Date
}

export interface UserPreferences {
  readingMode: 'single-page' | 'double-page'
  zoomLevel: number
  autoPreload: boolean
  downloadQuality: 'high' | 'medium' | 'low'
  notificationsEnabled: boolean
}

export interface UserLibrary {
  userId: string
  favorites: FavoriteSeries[]
  downloads: DownloadedSeries[]
  readingProgress: ReadingProgress[]
  preferences: UserPreferences
}

export interface DownloadTask {
  id: string
  seriesId: string
  chapterIds: string[]
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  estimatedTimeRemaining: number
  downloadPath: string
  createdAt: Date
  completedAt?: Date
}

// Search and display related types
export interface SeriesSearchResult {
  id: string
  title: string
  author: string
  coverImageUrl: string
  synopsis: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  rating: number
  sourceUrl: string
}

export interface TrendingContent {
  hotSeries: SeriesSearchResult[]
  latestReleases: SeriesSearchResult[]
  mostViewed: SeriesSearchResult[]
}

export interface UpdateNotification {
  seriesId: string
  seriesTitle: string
  newChapterIds: string[]
  notificationDate: Date
}

export interface PageUrl {
  pageNumber: number
  imageUrl: string
  localPath?: string
}

export interface PageData {
  pageNumber: number
  imageUrl: string
  altText?: string
  width?: number
  height?: number
}

// Latest releases and hot scans types for manhwaz scraper
export interface LatestRelease {
  id: string
  seriesTitle: string
  chapterNumber: string
  chapterTitle?: string
  coverImageUrl: string
  publishDate: Date
  seriesUrl: string
  chapterUrl: string
  isNew: boolean
}

export interface HotScan {
  id: string
  seriesTitle: string
  coverImageUrl: string
  rating: number
  viewCount: number
  rank: number
  genres: string[]
  status: 'ongoing' | 'completed'
  seriesUrl: string
  lastChapter: string
}

// Series details types for manhwaz scraper
export interface SeriesDetails {
  id: string
  title: string
  alternativeTitles: string[]
  author: string
  artist: string
  synopsis: string
  coverImageUrl: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  rating: number
  viewCount: number
  chapters: ChapterInfo[]
  lastUpdated: Date
  sourceUrl: string
}

export interface ChapterInfo {
  id: string
  chapterNumber: string
  title: string
  publishDate: Date
  chapterUrl: string
  pageCount?: number
}

// Re-export error types for convenience
export * from './errors'