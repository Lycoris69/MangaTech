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
  lastUpdated: string // ISO string from server
  sourceUrl: string
  chapters?: ChapterInfo[]
}

export interface ChapterInfo {
  id: string
  chapterNumber: string
  title: string
  publishDate: string // ISO string
  chapterUrl: string
  pageCount?: number
}

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
  lastUpdated?: string
  latestChapter?: string
}

export interface TrendingContent {
  hotSeries: SeriesSearchResult[]
  latestReleases: SeriesSearchResult[]
  mostViewed: SeriesSearchResult[]
}

export interface PageUrl {
  pageNumber: number
  imageUrl: string
  localPath?: string
  width?: number
  height?: number
}

export interface PageData {
  pageNumber: number
  imageUrl: string
  altText?: string
  width?: number
  height?: number
}

export interface UserLibrary {
  favorites: FavoriteSeries[]
  downloads: DownloadedSeries[]
  readingProgress: ReadingProgress[]
  preferences: UserPreferences
}

export interface FavoriteSeries {
  seriesId: string
  dateAdded: string
  lastReadChapter?: string
  notificationsEnabled: boolean
}

export interface DownloadedSeries {
  seriesId: string
  downloadPath: string
  downloadDate: string
  chapters: string[]
}

export interface ReadingProgress {
  seriesId: string
  chapterId: string
  pageNumber: number
  lastReadDate: string
}

export interface UserPreferences {
  readingMode: 'single-page' | 'double-page'
  zoomLevel: number
  autoPreload: boolean
  downloadQuality: 'high' | 'medium' | 'low'
  notificationsEnabled: boolean
}

export interface DownloadTask {
  id: string
  seriesId: string
  seriesTitle?: string
  chapterTitle?: string
  chapterIds: string[]
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  estimatedTimeRemaining: number
  downloadPath: string
  createdAt: string
  completedAt?: string
}
