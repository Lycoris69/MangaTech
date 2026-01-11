import { NotificationService } from './NotificationService';
import { LibraryService } from './LibraryService';
import { StorageService } from './StorageService';
import { FavoriteSeries, UpdateNotification } from '../types';
import { jest } from '@jest/globals';

// Mock the dependencies
jest.mock('./LibraryService');
jest.mock('./StorageService');

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-manga-app')
  }
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn()
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockLibraryService: jest.Mocked<LibraryService>;
  let mockStorageService: jest.Mocked<StorageService>;

  const mockFavorites: FavoriteSeries[] = [
    {
      seriesId: 'series-1',
      dateAdded: new Date(),
      notificationsEnabled: true
    },
    {
      seriesId: 'series-2',
      dateAdded: new Date(),
      notificationsEnabled: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    notificationService = new NotificationService();
    
    // Get mocked instances
    mockLibraryService = (notificationService as any).libraryService as jest.Mocked<LibraryService>;
    mockStorageService = (notificationService as any).storageService as jest.Mocked<StorageService>;
    
    // Setup default mocks
    mockLibraryService.getFavorites = jest.fn().mockResolvedValue(mockFavorites);
    mockLibraryService.getUserLibrary = jest.fn().mockResolvedValue({
      userId: 'test-user',
      favorites: mockFavorites,
      downloads: [],
      readingProgress: [],
      preferences: {
        readingMode: 'single-page',
        zoomLevel: 1.0,
        autoPreload: true,
        downloadQuality: 'high',
        notificationsEnabled: true
      }
    });
    
    mockStorageService.getSeriesById = jest.fn().mockResolvedValue({
      id: 'series-1',
      title: 'Test Series',
      author: 'Test Author',
      synopsis: 'Test synopsis',
      coverImageUrl: 'test-cover.jpg',
      genres: ['action'],
      status: 'ongoing',
      rating: 4.5,
      totalChapters: 10,
      lastUpdated: new Date(),
      sourceUrl: 'test-url'
    });
    
    mockStorageService.getUserDataPath = jest.fn().mockReturnValue('/tmp/test-manga-app');
    mockStorageService.saveUserLibrary = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up any intervals
    notificationService.stopPeriodicChecking();
  });

  describe('periodic checking', () => {
    test('should start and stop periodic checking', () => {
      // Mock setInterval and clearInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval');
      const mockClearInterval = jest.spyOn(global, 'clearInterval');
      
      notificationService.startPeriodicChecking();
      expect(mockSetInterval).toHaveBeenCalled();
      
      notificationService.stopPeriodicChecking();
      expect(mockClearInterval).toHaveBeenCalled();
      
      mockSetInterval.mockRestore();
      mockClearInterval.mockRestore();
    });
  });

  describe('notification management', () => {
    test('should enable notifications for a series', async () => {
      await notificationService.enableNotifications('series-1');
      
      expect(mockLibraryService.getUserLibrary).toHaveBeenCalled();
      expect(mockStorageService.saveUserLibrary).toHaveBeenCalled();
    });

    test('should disable notifications for a series', async () => {
      await notificationService.disableNotifications('series-1');
      
      expect(mockLibraryService.getUserLibrary).toHaveBeenCalled();
      expect(mockStorageService.saveUserLibrary).toHaveBeenCalled();
    });

    test('should get notification count', async () => {
      // Mock stored notifications
      const mockNotifications: UpdateNotification[] = [
        {
          seriesId: 'series-1',
          seriesTitle: 'Test Series',
          newChapterIds: ['chapter-1'],
          notificationDate: new Date()
        }
      ];

      // Mock fs.readFile to return notifications
      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNotifications));

      const count = await notificationService.getNotificationCount();
      expect(count).toBe(1);

      const seriesCount = await notificationService.getNotificationCount('series-1');
      expect(seriesCount).toBe(1);
    });

    test('should handle missing notifications file gracefully', async () => {
      // Mock fs.readFile to throw error (file not found)
      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const notifications = await notificationService.getStoredNotifications();
      expect(notifications).toEqual([]);
    });

    test('should clear stored notifications', async () => {
      const fs = await import('fs/promises');
      
      await notificationService.clearStoredNotifications();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/test-manga-app/notifications.json',
        JSON.stringify([], null, 2)
      );
    });

    test('should remove specific notification', async () => {
      const mockNotifications: UpdateNotification[] = [
        {
          seriesId: 'series-1',
          seriesTitle: 'Test Series 1',
          newChapterIds: ['chapter-1'],
          notificationDate: new Date()
        },
        {
          seriesId: 'series-2',
          seriesTitle: 'Test Series 2',
          newChapterIds: ['chapter-1'],
          notificationDate: new Date()
        }
      ];

      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNotifications));

      await notificationService.removeNotification('series-1');

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/test-manga-app/notifications.json',
        expect.stringContaining('series-2')
      );
    });
  });

  describe('error handling', () => {
    test('should handle library service errors gracefully', async () => {
      mockLibraryService.getFavorites.mockRejectedValue(new Error('Library error'));
      
      await expect(notificationService.checkForUpdatesAndNotify()).rejects.toThrow('Failed to check for updates');
    });

    test('should handle storage service errors gracefully', async () => {
      mockStorageService.getSeriesById.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw, but handle gracefully
      const result = await notificationService.checkForUpdatesAndNotify();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});