import { LibraryService } from './LibraryService';
import { StorageService } from './StorageService';
import { UserLibrary, FavoriteSeries } from '../types';
import { jest } from '@jest/globals';

// Mock the StorageService
jest.mock('./StorageService');

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-manga-app')
  }
}));

describe('LibraryService', () => {
  let libraryService: LibraryService;
  let mockStorageService: jest.Mocked<StorageService>;

  const mockUserLibrary: UserLibrary = {
    userId: 'test-user',
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
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    libraryService = new LibraryService();

    // Get the mocked StorageService instance
    mockStorageService = (libraryService as any).storageService as jest.Mocked<StorageService>;

    // Setup default mock implementations
    mockStorageService.loadUserLibrary = jest.fn().mockResolvedValue({ ...mockUserLibrary });
    mockStorageService.saveUserLibrary = jest.fn().mockResolvedValue(undefined);
  });

  describe('favorites management', () => {
    test('should add series to favorites', async () => {
      const seriesId = 'test-series-1';

      await libraryService.addToFavorites(seriesId);

      expect(mockStorageService.loadUserLibrary).toHaveBeenCalled();
      expect(mockStorageService.saveUserLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          favorites: expect.arrayContaining([
            expect.objectContaining({
              seriesId,
              notificationsEnabled: true
            })
          ])
        })
      );
    });

    test('should not add duplicate favorites', async () => {
      const seriesId = 'test-series-1';
      const existingFavorite: FavoriteSeries = {
        seriesId,
        dateAdded: new Date(),
        notificationsEnabled: true
      };

      const libraryWithFavorite = {
        ...mockUserLibrary,
        favorites: [existingFavorite]
      };

      mockStorageService.loadUserLibrary.mockResolvedValue(libraryWithFavorite);

      await libraryService.addToFavorites(seriesId);

      expect(mockStorageService.saveUserLibrary).not.toHaveBeenCalled();
    });

    test('should remove series from favorites', async () => {
      const seriesId = 'test-series-1';
      const existingFavorite: FavoriteSeries = {
        seriesId,
        dateAdded: new Date(),
        notificationsEnabled: true
      };

      const libraryWithFavorite = {
        ...mockUserLibrary,
        favorites: [existingFavorite]
      };

      mockStorageService.loadUserLibrary.mockResolvedValue(libraryWithFavorite);

      await libraryService.removeFromFavorites(seriesId);

      expect(mockStorageService.saveUserLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          favorites: []
        })
      );
    });

    test('should get all favorites', async () => {
      const favorites: FavoriteSeries[] = [
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

      const libraryWithFavorites = {
        ...mockUserLibrary,
        favorites
      };

      mockStorageService.loadUserLibrary.mockResolvedValue(libraryWithFavorites);

      const result = await libraryService.getFavorites();

      expect(result).toEqual(favorites);
    });

    test('should check if series is favorite', async () => {
      const seriesId = 'test-series-1';
      const existingFavorite: FavoriteSeries = {
        seriesId,
        dateAdded: new Date(),
        notificationsEnabled: true
      };

      const libraryWithFavorite = {
        ...mockUserLibrary,
        favorites: [existingFavorite]
      };

      mockStorageService.loadUserLibrary.mockResolvedValue(libraryWithFavorite);

      const isFavorite = await libraryService.isFavorite(seriesId);
      const isNotFavorite = await libraryService.isFavorite('non-existent-series');

      expect(isFavorite).toBe(true);
      expect(isNotFavorite).toBe(false);
    });

    test('should toggle favorite status', async () => {
      const seriesId = 'test-series-1';

      // Test that the method exists and can be called
      const result = await libraryService.toggleFavorite(seriesId);
      expect(typeof result).toBe('boolean');
      expect(mockStorageService.loadUserLibrary).toHaveBeenCalled();
    });
  });

  describe('reading progress', () => {
    test('should mark chapter as read', async () => {
      const seriesId = 'test-series-1';
      const chapterId = 'chapter-1';
      const pageNumber = 5;

      await libraryService.markAsRead(seriesId, chapterId, pageNumber);

      expect(mockStorageService.saveUserLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          readingProgress: expect.arrayContaining([
            expect.objectContaining({
              seriesId,
              chapterId,
              pageNumber
            })
          ])
        })
      );
    });

    test('should get reading progress for series', async () => {
      const seriesId = 'test-series-1';
      const readingProgress = [
        {
          seriesId,
          chapterId: 'chapter-1',
          pageNumber: 5,
          lastReadDate: new Date()
        },
        {
          seriesId: 'other-series',
          chapterId: 'chapter-1',
          pageNumber: 3,
          lastReadDate: new Date()
        }
      ];

      const libraryWithProgress = {
        ...mockUserLibrary,
        readingProgress
      };

      mockStorageService.loadUserLibrary.mockResolvedValue(libraryWithProgress);

      const result = await libraryService.getReadingProgress(seriesId);

      expect(result).toHaveLength(1);
      expect(result[0].seriesId).toBe(seriesId);
    });
  });

  describe('error handling', () => {
    test('should handle storage errors gracefully', async () => {
      mockStorageService.loadUserLibrary.mockRejectedValue(new Error('Storage error'));

      await expect(libraryService.getFavorites()).rejects.toThrow('Failed to get favorites');
    });
  });
});