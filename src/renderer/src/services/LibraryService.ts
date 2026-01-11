import { UserLibrary, FavoriteSeries, UpdateNotification, ReadingProgress } from '../types';
import { StorageService } from './StorageService';

export class LibraryService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Add a series to user's favorites
   */
  async addToFavorites(seriesId: string): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      // Check if already in favorites
      const existingFavorite = library.favorites.find(fav => fav.seriesId === seriesId);
      if (existingFavorite) {
        return; // Already in favorites
      }

      const newFavorite: FavoriteSeries = {
        seriesId,
        dateAdded: new Date(),
        notificationsEnabled: true
      };

      library.favorites.push(newFavorite);
      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to add to favorites: ${error}`);
    }
  }

  /**
   * Remove a series from user's favorites
   */
  async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      library.favorites = library.favorites.filter(fav => fav.seriesId !== seriesId);
      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to remove from favorites: ${error}`);
    }
  }

  /**
   * Get all favorite series
   */
  async getFavorites(): Promise<FavoriteSeries[]> {
    try {
      const library = await this.storageService.loadUserLibrary();
      return library.favorites;
    } catch (error) {
      throw new Error(`Failed to get favorites: ${error}`);
    }
  }

  /**
   * Check if a series is in favorites
   */
  async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.seriesId === seriesId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Toggle favorite status for a series
   */
  async toggleFavorite(seriesId: string): Promise<boolean> {
    try {
      const isCurrentlyFavorite = await this.isFavorite(seriesId);

      if (isCurrentlyFavorite) {
        await this.removeFromFavorites(seriesId);
        return false;
      } else {
        await this.addToFavorites(seriesId);
        return true;
      }
    } catch (error) {
      throw new Error(`Failed to toggle favorite: ${error}`);
    }
  }

  /**
   * Check for updates to favorite series (mock implementation)
   */
  async checkForUpdates(): Promise<UpdateNotification[]> {
    try {
      const favorites = await this.getFavorites();
      const notifications: UpdateNotification[] = [];

      // Mock implementation - in real app, this would check external sources
      for (const favorite of favorites) {
        // Simulate random updates for demonstration
        if (Math.random() > 0.7) { // 30% chance of having updates
          const notification: UpdateNotification = {
            seriesId: favorite.seriesId,
            seriesTitle: `Series ${favorite.seriesId}`, // Would be actual title
            newChapterIds: [`${favorite.seriesId}-new-chapter-${Date.now()}`],
            notificationDate: new Date()
          };
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      throw new Error(`Failed to check for updates: ${error}`);
    }
  }

  /**
   * Mark a chapter as read
   */
  async markAsRead(seriesId: string, chapterId: string, pageNumber: number = 1): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      // Remove existing progress for this chapter
      library.readingProgress = library.readingProgress.filter(
        progress => !(progress.seriesId === seriesId && progress.chapterId === chapterId)
      );

      // Add new reading progress
      const newProgress: ReadingProgress = {
        seriesId,
        chapterId,
        pageNumber,
        lastReadDate: new Date()
      };

      library.readingProgress.push(newProgress);
      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to mark as read: ${error}`);
    }
  }

  /**
   * Get reading progress for a series
   */
  async getReadingProgress(seriesId: string): Promise<ReadingProgress[]> {
    try {
      const library = await this.storageService.loadUserLibrary();
      return library.readingProgress.filter(progress => progress.seriesId === seriesId);
    } catch (error) {
      throw new Error(`Failed to get reading progress: ${error}`);
    }
  }

  /**
   * Get the last read chapter for a series
   */
  async getLastReadChapter(seriesId: string): Promise<ReadingProgress | null> {
    try {
      const progress = await this.getReadingProgress(seriesId);
      if (progress.length === 0) return null;

      // Return the most recently read chapter
      return progress.reduce((latest, current) =>
        current.lastReadDate > latest.lastReadDate ? current : latest
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Update favorite series with last read chapter
   */
  async updateLastReadChapter(seriesId: string, chapterId: string): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      const favoriteIndex = library.favorites.findIndex(fav => fav.seriesId === seriesId);
      if (favoriteIndex >= 0) {
        library.favorites[favoriteIndex].lastReadChapter = chapterId;
        await this.storageService.saveUserLibrary(library);
      }
    } catch (error) {
      throw new Error(`Failed to update last read chapter: ${error}`);
    }
  }

  /**
   * Get complete user library
   */
  async getUserLibrary(): Promise<UserLibrary> {
    try {
      return await this.storageService.loadUserLibrary();
    } catch (error) {
      throw new Error(`Failed to get user library: ${error}`);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserLibrary['preferences']>): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();
      library.preferences = { ...library.preferences, ...preferences };
      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to update preferences: ${error}`);
    }
  }

  /**
   * Register a downloaded chapter in the library
   */
  async registerDownload(seriesId: string, chapterId: string, downloadPath: string): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      let downloadedSeries = library.downloads.find(d => d.seriesId === seriesId);
      if (!downloadedSeries) {
        downloadedSeries = {
          seriesId,
          downloadPath: downloadPath, // Store the path for reference
          downloadDate: new Date(),
          chapters: []
        };
        library.downloads.push(downloadedSeries);
      }

      if (!downloadedSeries.chapters.includes(chapterId)) {
        downloadedSeries.chapters.push(chapterId);
      }

      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to register download: ${error}`);
    }
  }
}