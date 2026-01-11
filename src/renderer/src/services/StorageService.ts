import { UserLibrary, Series, Chapter, DownloadTask } from '../types'

export class StorageService {
  private readonly libraryFileName = 'user-library.json'
  private readonly seriesFileName = 'series-metadata.json'
  private readonly downloadsFileName = 'download-tasks.json'

  constructor() {
    // Storage operations handled via IPC to Main Process (File System)
  }

  /**
   * Initialize storage directories and default files
   */
  async initialize(): Promise<void> {
    try {
      // Initialize default user library if it doesn't exist
      const existingLibrary = await this.readJSON(this.libraryFileName)
      if (!existingLibrary) {
        const defaultLibrary: UserLibrary = {
          userId: 'default-user',
          favorites: [],
          downloads: [],
          readingProgress: [],
          preferences: {
            readingMode: 'single-page',
            zoomLevel: 1.0,
            autoPreload: true,
            downloadQuality: 'high',
            notificationsEnabled: true
          }
        }
        await this.saveUserLibrary(defaultLibrary)
      }

      // Initialize empty series metadata
      const existingSeries = await this.readJSON(this.seriesFileName)
      if (!existingSeries) {
        await this.writeJSON(this.seriesFileName, [])
      }

      // Initialize empty download tasks
      const existingDownloads = await this.readJSON(this.downloadsFileName)
      if (!existingDownloads) {
        await this.writeJSON(this.downloadsFileName, [])
      }
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error}`)
    }
  }

  private async readJSON(filename: string): Promise<any> {
    if (window.electronAPI && window.electronAPI.storage) {
      return await window.electronAPI.storage.read(filename);
    }
    // Fallback?
    const data = localStorage.getItem(filename);
    return data ? JSON.parse(data) : null;
  }

  private async writeJSON(filename: string, data: any): Promise<void> {
    if (window.electronAPI && window.electronAPI.storage) {
      await window.electronAPI.storage.write(filename, data);
      return;
    }
    // Fallback
    localStorage.setItem(filename, JSON.stringify(data));
  }

  /**
   * Save user library data
   */
  async saveUserLibrary(library: UserLibrary): Promise<void> {
    try {
      await this.writeJSON(this.libraryFileName, library)
    } catch (error) {
      throw new Error(`Failed to save user library: ${error}`)
    }
  }

  /**
   * Load user library data
   */
  async loadUserLibrary(): Promise<UserLibrary> {
    try {
      const library = await this.readJSON(this.libraryFileName)
      if (!library) {
        throw new Error('User library not found')
      }

      // Convert date strings back to Date objects
      library.favorites = library.favorites.map(fav => ({
        ...fav,
        dateAdded: new Date(fav.dateAdded)
      }))

      library.downloads = library.downloads.map(download => ({
        ...download,
        downloadDate: new Date(download.downloadDate)
      }))

      library.readingProgress = library.readingProgress.map(progress => ({
        ...progress,
        lastReadDate: new Date(progress.lastReadDate)
      }))

      return library as UserLibrary
    } catch (error) {
      throw new Error(`Failed to load user library: ${error}`)
    }
  }

  /**
   * Save series metadata
   */
  async saveSeriesMetadata(series: Series[]): Promise<void> {
    try {
      await this.writeJSON(this.seriesFileName, series)
    } catch (error) {
      throw new Error(`Failed to save series metadata: ${error}`)
    }
  }

  /**
   * Load series metadata
   */
  async loadSeriesMetadata(): Promise<Series[]> {
    try {
      const series = await this.readJSON(this.seriesFileName)
      if (!series) {
        return []
      }

      // Convert date strings back to Date objects
      return series.map(s => ({
        ...s,
        lastUpdated: new Date(s.lastUpdated)
      })) as Series[]
    } catch (error) {
      throw new Error(`Failed to load series metadata: ${error}`)
    }
  }

  /**
   * Save download tasks
   */
  async saveDownloadTasks(tasks: DownloadTask[]): Promise<void> {
    try {
      await this.writeJSON(this.downloadsFileName, tasks)
    } catch (error) {
      throw new Error(`Failed to save download tasks: ${error}`)
    }
  }

  /**
   * Load download tasks
   */
  async loadDownloadTasks(): Promise<DownloadTask[]> {
    try {
      const tasks = await this.readJSON(this.downloadsFileName)
      if (!tasks) {
        return []
      }

      // Convert date strings back to Date objects
      return tasks.map(task => ({
        ...task,
        createdAt: new Date(task.createdAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined
      })) as DownloadTask[]
    } catch (error) {
      throw new Error(`Failed to load download tasks: ${error}`)
    }
  }

  /**
   * Add or update a single series in metadata
   */
  async upsertSeries(series: Series): Promise<void> {
    try {
      let allSeries: Series[] = []
      try {
        allSeries = await this.loadSeriesMetadata()
      } catch {
        allSeries = []
      }

      const existingIndex = allSeries.findIndex(s => s.id === series.id)

      if (existingIndex >= 0) {
        allSeries[existingIndex] = series
      } else {
        allSeries.push(series)
      }

      await this.saveSeriesMetadata(allSeries)
    } catch (error) {
      throw new Error(`Failed to upsert series: ${error}`)
    }
  }

  /**
   * Get a specific series by ID
   */
  async getSeriesById(seriesId: string): Promise<Series | null> {
    try {
      const allSeries = await this.loadSeriesMetadata()
      return allSeries.find(s => s.id === seriesId) || null
    } catch (error) {
      throw new Error(`Failed to get series by ID: ${error}`)
    }
  }

  /**
   * Delete series metadata
   */
  async deleteSeries(seriesId: string): Promise<void> {
    try {
      const allSeries = await this.loadSeriesMetadata()
      const filteredSeries = allSeries.filter(s => s.id !== seriesId)
      await this.saveSeriesMetadata(filteredSeries)
    } catch (error) {
      throw new Error(`Failed to delete series: ${error}`)
    }
  }

  /**
   * Verify data integrity
   */
  async verifyFileIntegrity(key: string): Promise<boolean> {
    // Checking if the file content is retrievable
    const data = await this.readJSON(key);
    return data !== null;
  }

  getStorageType(): string {
    return 'FileSystem (IPC)'
  }
}