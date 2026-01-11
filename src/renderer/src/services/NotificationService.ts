import { UpdateNotification, FavoriteSeries, Series } from '../types';
import { LibraryService } from './LibraryService';
import { StorageService } from './StorageService';

export class NotificationService {
  private libraryService: LibraryService;
  private storageService: StorageService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.libraryService = new LibraryService();
    this.storageService = new StorageService();
  }

  /**
   * Start periodic checking for updates
   */
  startPeriodicChecking(): void {
    if (this.checkInterval) {
      this.stopPeriodicChecking();
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkForUpdatesAndNotify();
      } catch (error) {
        console.error('Error during periodic update check:', error);
      }
    }, this.CHECK_INTERVAL_MS);

    // Also check immediately
    this.checkForUpdatesAndNotify().catch(error => {
      console.error('Error during initial update check:', error);
    });
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for updates and create notifications
   */
  async checkForUpdatesAndNotify(): Promise<UpdateNotification[]> {
    try {
      const favorites = await this.libraryService.getFavorites();
      const notifications: UpdateNotification[] = [];

      for (const favorite of favorites) {
        if (!favorite.notificationsEnabled) {
          continue;
        }

        const updates = await this.checkSeriesForUpdates(favorite);
        if (updates) {
          notifications.push(updates);
        }
      }

      // Store notifications for later retrieval
      if (notifications.length > 0) {
        await this.storeNotifications(notifications);
        this.showSystemNotifications(notifications);
      }

      return notifications;
    } catch (error) {
      throw new Error(`Failed to check for updates: ${error}`);
    }
  }

  /**
   * Check a specific series for updates
   */
  private async checkSeriesForUpdates(favorite: FavoriteSeries): Promise<UpdateNotification | null> {
    try {
      // Get series metadata
      const series = await this.storageService.getSeriesById(favorite.seriesId);
      if (!series) {
        return null;
      }

      // Mock implementation - in real app, this would check external sources
      // For now, simulate random updates for demonstration
      const hasUpdates = Math.random() > 0.8; // 20% chance of updates
      
      if (hasUpdates) {
        const newChapterIds = [
          `${favorite.seriesId}-chapter-${Date.now()}`,
          `${favorite.seriesId}-chapter-${Date.now() + 1}`
        ];

        return {
          seriesId: favorite.seriesId,
          seriesTitle: series.title,
          newChapterIds,
          notificationDate: new Date()
        };
      }

      return null;
    } catch (error) {
      console.error(`Error checking updates for series ${favorite.seriesId}:`, error);
      return null;
    }
  }

  /**
   * Store notifications in local storage
   */
  private async storeNotifications(notifications: UpdateNotification[]): Promise<void> {
    try {
      const existingNotifications = await this.getStoredNotifications();
      const allNotifications = [...existingNotifications, ...notifications];
      
      // Keep only the last 50 notifications to prevent storage bloat
      const recentNotifications = allNotifications
        .sort((a, b) => b.notificationDate.getTime() - a.notificationDate.getTime())
        .slice(0, 50);

      const notificationsPath = `${this.storageService.getUserDataPath()}/notifications.json`;
      const fs = await import('fs/promises');
      await fs.writeFile(notificationsPath, JSON.stringify(recentNotifications, null, 2));
    } catch (error) {
      console.error('Failed to store notifications:', error);
    }
  }

  /**
   * Get stored notifications
   */
  async getStoredNotifications(): Promise<UpdateNotification[]> {
    try {
      const notificationsPath = `${this.storageService.getUserDataPath()}/notifications.json`;
      const fs = await import('fs/promises');
      
      try {
        const data = await fs.readFile(notificationsPath, 'utf-8');
        const notifications = JSON.parse(data) as UpdateNotification[];
        
        // Convert date strings back to Date objects
        return notifications.map(notif => ({
          ...notif,
          notificationDate: new Date(notif.notificationDate)
        }));
      } catch {
        // File doesn't exist or is invalid, return empty array
        return [];
      }
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  /**
   * Clear stored notifications
   */
  async clearStoredNotifications(): Promise<void> {
    try {
      const notificationsPath = `${this.storageService.getUserDataPath()}/notifications.json`;
      const fs = await import('fs/promises');
      await fs.writeFile(notificationsPath, JSON.stringify([], null, 2));
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Remove specific notification
   */
  async removeNotification(seriesId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const filteredNotifications = notifications.filter(notif => notif.seriesId !== seriesId);
      
      const notificationsPath = `${this.storageService.getUserDataPath()}/notifications.json`;
      const fs = await import('fs/promises');
      await fs.writeFile(notificationsPath, JSON.stringify(filteredNotifications, null, 2));
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  }

  /**
   * Show system notifications (if supported)
   */
  private showSystemNotifications(notifications: UpdateNotification[]): void {
    try {
      // Check if we're in an Electron environment and notifications are supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // Request permission if not already granted
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
          notifications.forEach(notification => {
            const systemNotification = new Notification(`New chapters available!`, {
              body: `${notification.seriesTitle} has ${notification.newChapterIds.length} new chapter(s)`,
              icon: '/placeholder-cover.svg', // Use app icon
              tag: notification.seriesId // Prevent duplicate notifications
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
              systemNotification.close();
            }, 5000);
          });
        }
      }
    } catch (error) {
      console.error('Failed to show system notifications:', error);
    }
  }

  /**
   * Enable notifications for a series
   */
  async enableNotifications(seriesId: string): Promise<void> {
    try {
      const library = await this.libraryService.getUserLibrary();
      const favoriteIndex = library.favorites.findIndex(fav => fav.seriesId === seriesId);
      
      if (favoriteIndex >= 0) {
        library.favorites[favoriteIndex].notificationsEnabled = true;
        await this.storageService.saveUserLibrary(library);
      }
    } catch (error) {
      throw new Error(`Failed to enable notifications: ${error}`);
    }
  }

  /**
   * Disable notifications for a series
   */
  async disableNotifications(seriesId: string): Promise<void> {
    try {
      const library = await this.libraryService.getUserLibrary();
      const favoriteIndex = library.favorites.findIndex(fav => fav.seriesId === seriesId);
      
      if (favoriteIndex >= 0) {
        library.favorites[favoriteIndex].notificationsEnabled = false;
        await this.storageService.saveUserLibrary(library);
      }
    } catch (error) {
      throw new Error(`Failed to disable notifications: ${error}`);
    }
  }

  /**
   * Get notification count for a series
   */
  async getNotificationCount(seriesId?: string): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      
      if (seriesId) {
        return notifications.filter(notif => notif.seriesId === seriesId).length;
      }
      
      return notifications.length;
    } catch (error) {
      console.error('Failed to get notification count:', error);
      return 0;
    }
  }
}