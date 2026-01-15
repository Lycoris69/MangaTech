import { UserLibrary, FavoriteSeries, ReadingProgress, Series } from '../types';
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
        dateAdded: new Date()
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
  async registerDownload(seriesId: string, chapterId: string, paths: { chapterPath: string, seriesPath: string }): Promise<void> {
    try {
      const library = await this.storageService.loadUserLibrary();

      let downloadedSeries = library.downloads.find(d => d.seriesId === seriesId);
      if (!downloadedSeries) {
        downloadedSeries = {
          seriesId,
          downloadPath: paths.seriesPath, // Use the proper series base path
          downloadDate: new Date(),
          chapters: []
        };
        library.downloads.push(downloadedSeries);
      } else {
        // Update series path if it was empty or wrong
        downloadedSeries.downloadPath = paths.seriesPath;
      }

      // Use findIndex or similar to handle both string and object IDs, checking both ID and Path
      const chapterIndex = downloadedSeries.chapters.findIndex(c => {
        if (typeof c === 'string') return c === chapterId;
        return c.id === chapterId || (c.path && c.path === paths.chapterPath);
      });

      if (chapterIndex === -1) {
        downloadedSeries.chapters.push({
          id: chapterId,
          path: paths.chapterPath
        });
      } else {
        // Update path if it was just a string before
        downloadedSeries.chapters[chapterIndex] = {
          id: chapterId,
          path: paths.chapterPath
        };
      }

      await this.storageService.saveUserLibrary(library);
    } catch (error) {
      throw new Error(`Failed to register download: ${error}`);
    }
  }

  /**
   * Import locally downloaded series from a base path
   */
  async importLocalDownloads(basePath: string): Promise<number> {
    console.log(`[LibraryService] Importing from: ${basePath}`);
    try {
      if (!window.electronAPI?.scraper) {
        throw new Error('Electron API not available');
      }

      const scannedSeries = await window.electronAPI.scraper.scanLocalDownloads(basePath);
      console.log(`[LibraryService] Scanned ${scannedSeries.length} series`);

      const library = await this.storageService.loadUserLibrary();
      const allMetadata = await this.storageService.loadSeriesMetadata();

      for (const series of scannedSeries) {
        console.log(`[LibraryService] Processing series: ${series.title}`);

        // 1. Better metadata matching: Exact ID, then exact Title, then fuzzy Title
        let seriesMetadata = await this.storageService.getSeriesById(series.title);

        if (!seriesMetadata) {
          // Search all metadata by title (case-insensitive)
          seriesMetadata = allMetadata.find(m =>
            m.title.toLowerCase() === series.title.toLowerCase()
          ) || null;
        }

        // 2. If not found locally, try to search online
        if (!seriesMetadata) {
          console.log(`[LibraryService] Metadata not found for ${series.title}, searching online...`);
          try {
            const searchResults = await window.electronAPI.scraper.searchSeries(series.title);
            if (searchResults && searchResults.length > 0) {
              const match = searchResults.find(r => r.title.toLowerCase() === series.title.toLowerCase()) || searchResults[0];
              const fullDetails = await window.electronAPI.scraper.getSeriesDetails(match.id);
              if (fullDetails) {
                seriesMetadata = fullDetails;
                console.log(`[LibraryService] Found online metadata for ${series.title} -> ${fullDetails.id}`);
                await this.storageService.upsertSeries(fullDetails);
                allMetadata.push(fullDetails); // Update local cache for remaining items
              }
            }
          } catch (searchError) {
            console.warn(`[LibraryService] Online search failed for ${series.title}:`, searchError);
          }
        }

        // 3. Fallback: Create placeholder metadata if still not found
        if (!seriesMetadata) {
          console.log(`[LibraryService] Creating placeholder metadata for ${series.title}`);
          const placeholder: Series = {
            id: series.title,
            title: series.title,
            author: 'Unknown Author',
            synopsis: 'Imported from local downloads.',
            coverImageUrl: '',
            genres: [],
            status: 'ongoing',
            rating: 0,
            totalChapters: series.chapters.length,
            lastUpdated: new Date(),
            sourceUrl: '',
            chapters: series.chapters.map((c: any) => ({
              id: c.id,
              title: c.title,
              chapterNumber: c.title.replace(/[^0-9.]/g, '') || '0'
            })) as any
          };

          seriesMetadata = placeholder;
          await this.storageService.upsertSeries(seriesMetadata);
          allMetadata.push(seriesMetadata);
        }

        if (!seriesMetadata) continue;

        const seriesId = seriesMetadata.id;

        // 4. Find existing download entry (by ID OR Path) to prevent duplicates
        let downloadedSeries = library.downloads.find(d =>
          d.seriesId === seriesId || d.downloadPath === series.path
        );

        if (!downloadedSeries) {
          downloadedSeries = {
            seriesId,
            downloadPath: series.path,
            downloadDate: new Date(),
            chapters: []
          };
          library.downloads.push(downloadedSeries);
        } else {
          // Update details for existing entry
          downloadedSeries.seriesId = seriesId;
          downloadedSeries.downloadPath = series.path;
        }

        // 5. Merge chapters and reconcile with disk
        const scannedChapters = series.chapters as any[];
        const scannedPaths = new Set(scannedChapters.map(c => c.path));

        // Map existing chapters by path for quick lookup
        const existingByPath = new Map<string, any>();
        downloadedSeries.chapters.forEach(c => {
          if (typeof c !== 'string' && c.path) {
            existingByPath.set(c.path, c);
          }
        });

        // 6. Reconciliation: Remove stale entries that are no longer on disk
        // ONLY if the series downloadPath matches the scanned series path
        if (downloadedSeries.downloadPath === series.path) {
          downloadedSeries.chapters = downloadedSeries.chapters.filter(existingChapter => {
            if (typeof existingChapter === 'string') return true; // Keep legacy string entries
            const path = existingChapter.path;
            if (!path) return true;

            // If the chapter folder is under the scanned series path, but wasn't found during scan, it's gone.
            if (path.startsWith(series.path) && !scannedPaths.has(path)) {
              return false;
            }
            return true;
          });
        }

        // 7. Add new chapters or update existing ones
        for (const scannedChapter of scannedChapters) {
          // Check if already exists by path
          if (existingByPath.has(scannedChapter.path)) {
            continue;
          }

          // Check if already exists by ID
          const existsById = downloadedSeries.chapters.some(existingChapter =>
            (typeof existingChapter === 'string' ? existingChapter : existingChapter.id) === scannedChapter.id
          );

          if (!existsById) {
            downloadedSeries.chapters.push({
              id: scannedChapter.id,
              path: scannedChapter.path || ''
            });
          }
        }
      }

      await this.storageService.saveUserLibrary(library);
      console.log('[LibraryService] Library saved successfully');
      return scannedSeries.length;
    } catch (error) {
      console.error('[LibraryService] Import failed:', error);
      throw new Error(`Failed to import local downloads: ${error}`);
    }
  }
}