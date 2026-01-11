import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryService } from '../services/LibraryService';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { FavoriteSeries, DownloadedSeries, ReadingProgress, Series, UpdateNotification } from '../types';
import { LoadingState, SkeletonCard } from '../components/LoadingSpinner';
import { useNotifications } from '../components/NotificationSystem';
import { errorService } from '../services/ErrorService';
import { ErrorType } from '../types/errors';
import OnlineReader from '../components/OnlineReader';
import './LibraryPage.css';

interface LibraryPageProps {
  onEnterReading?: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onEnterReading }) => {
  const [favorites, setFavorites] = useState<FavoriteSeries[]>([]);
  const [downloads, setDownloads] = useState<DownloadedSeries[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [seriesMetadata, setSeriesMetadata] = useState<Series[]>([]);
  const [notifications, setNotifications] = useState<UpdateNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [readingSeriesId, setReadingSeriesId] = useState<string | null>(null);
  const [initialPage, setInitialPage] = useState(1);

  const libraryService = new LibraryService();
  const storageService = new StorageService();
  const notificationService = new NotificationService();
  const { success: showSuccess, error: showError } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    loadLibraryData();
    loadNotifications();

    // Start periodic checking for updates
    notificationService.startPeriodicChecking();

    // Cleanup on unmount
    return () => {
      notificationService.stopPeriodicChecking();
    };
  }, []);

  const loadLibraryData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Initialize storage if needed
      await storageService.initialize();

      // Load all library data
      const [favoritesData, libraryData, seriesData] = await Promise.all([
        libraryService.getFavorites(),
        libraryService.getUserLibrary(),
        storageService.loadSeriesMetadata()
      ]);

      setFavorites(favoritesData);
      setDownloads(libraryData.downloads);
      setReadingProgress(libraryData.readingProgress);
      setSeriesMetadata(seriesData);

      if (isRefresh) {
        showSuccess('Library refreshed', 'Your library data has been updated.');
      }
    } catch (err) {
      const appError = errorService.createError(
        ErrorType.STORAGE,
        'Failed to load library data',
        {
          details: err instanceof Error ? err.message : 'Unknown error',
          retryable: true,
          context: { component: 'LibraryPage', operation: 'loadLibraryData' }
        }
      );

      setError(appError.userMessage);

      showError(
        'Failed to load library',
        'Unable to load your library data. Please try again.',
        {
          actions: [
            {
              label: 'Retry',
              action: () => loadLibraryData(isRefresh),
              primary: true
            }
          ]
        }
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const storedNotifications = await notificationService.getStoredNotifications();
      setNotifications(storedNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleRemoveFavorite = async (seriesId: string) => {
    try {
      await libraryService.removeFromFavorites(seriesId);
      setFavorites(prev => prev.filter(fav => fav.seriesId !== seriesId));
      showSuccess('Removed from favorites', 'Series has been removed from your favorites.');
    } catch (err) {
      const appError = errorService.createError(
        ErrorType.STORAGE,
        'Failed to remove favorite',
        {
          details: err instanceof Error ? err.message : 'Unknown error',
          retryable: true
        }
      );

      showError('Failed to remove favorite', appError.userMessage);
    }
  };

  const handleDeleteDownload = async (seriesId: string) => {
    try {
      // Remove from downloads list
      setDownloads(prev => prev.filter(download => download.seriesId !== seriesId));

      // Update library data
      const library = await libraryService.getUserLibrary();
      library.downloads = library.downloads.filter(download => download.seriesId !== seriesId);
      await storageService.saveUserLibrary(library);
    } catch (err) {
      setError(`Failed to delete download: ${err}`);
    }
  };

  const getSeriesById = (seriesId: string): Series | null => {
    return seriesMetadata.find(series => series.id === seriesId) || null;
  };

  const getLastReadChapter = (seriesId: string): ReadingProgress | null => {
    const seriesProgress = readingProgress.filter(progress => progress.seriesId === seriesId);
    if (seriesProgress.length === 0) return null;

    return seriesProgress.reduce((latest, current) =>
      current.lastReadDate.getTime() > latest.lastReadDate.getTime() ? current : latest
    );
  };

  const getDisplayTitle = (seriesId: string, downloadPath?: string): string => {
    const series = getSeriesById(seriesId);
    if (series?.title) return series.title;

    if (downloadPath) {
      // Extract name from path (e.g. /path/to/Solo Leveling -> Solo Leveling)
      const parts = downloadPath.split(/[/\\]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart) return lastPart;
    }

    return 'Unknown Series';
  };

  const dismissNotification = async (seriesId: string) => {
    try {
      await notificationService.removeNotification(seriesId);
      setNotifications(prev => prev.filter(notif => notif.seriesId !== seriesId));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const handleReadSeries = async (seriesId: string) => {
    try {
      // 1. Check for bookmark / reading progress
      const lastRead = getLastReadChapter(seriesId);
      if (lastRead) {
        setReadingSeriesId(seriesId);
        setReadingChapterId(lastRead.chapterId);
        setInitialPage(lastRead.pageNumber || 1);
        return;
      }

      // 2. If no progress, check if downloaded and start at first chapter
      const download = downloads.find(d => d.seriesId === seriesId);
      if (download && download.chapters.length > 0) {
        // Sort chapters to find the "first" one (heuristic: lowest number/name)
        const sortedChapters = [...download.chapters].sort();
        setReadingSeriesId(seriesId);
        setReadingChapterId(sortedChapters[0]);
        setInitialPage(1);
        return;
      }

      // 3. Fallback: Navigate to series page if we can't start reading immediately
      navigate(`/series/${encodeURIComponent(seriesId)}`);
    } catch (err) {
      console.error('Failed to start reading:', err);
      navigate(`/series/${encodeURIComponent(seriesId)}`);
    }
  };

  const handleReadChapterDirect = (seriesId: string, chapterId: string, pageNumber: number = 1) => {
    setReadingSeriesId(seriesId);
    setReadingChapterId(chapterId);
    setInitialPage(pageNumber);
  };

  const handleCloseReader = () => {
    setReadingChapterId(null);
    setReadingSeriesId(null);
    loadLibraryData(); // Refresh progress info on close
  };



  return (
    <div className="library-page">
      <LoadingState
        loading={loading}
        error={error}
        loadingMessage="Loading your library..."
        errorMessage={error || undefined}
        onRetry={() => loadLibraryData()}
      >
        <div className="page-header">
          <h2>My Library</h2>
          <p>Manage your favorite series and downloaded content</p>
          <div className="header-actions">
            <button
              onClick={() => loadLibraryData(true)}
              disabled={refreshing}
              className="refresh-button"
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
          {notifications.length > 0 && (
            <div className="notifications-banner">
              <p>{notifications.length} series have new chapters available!</p>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <section className="notifications-section">
            <h3>New Chapter Updates</h3>
            <div className="notifications-list">
              {notifications.map(notification => (
                <div key={notification.seriesId} className="notification-item">
                  <div className="notification-content">
                    <h4>{notification.seriesTitle}</h4>
                    <p>{notification.newChapterIds.length} new chapter(s) available</p>
                    <span className="notification-date">
                      {notification.notificationDate.toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="dismiss-btn"
                    onClick={() => dismissNotification(notification.seriesId)}
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="library-sections">
          {/* Favorites Section */}
          <section className="favorites-section">
            <h3>Favorites ({favorites.length})</h3>
            {favorites.length === 0 ? (
              <div className="content-placeholder">
                <p>No favorite series yet. Add some from the homepage or search!</p>
              </div>
            ) : (
              <div className="series-grid">
                {favorites.map(favorite => {
                  const series = getSeriesById(favorite.seriesId);
                  const lastRead = getLastReadChapter(favorite.seriesId);

                  return (
                    <div
                      key={favorite.seriesId}
                      className="series-card favorite"
                      onClick={() => handleReadSeries(favorite.seriesId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="series-cover">
                        {series?.coverImageUrl ? (
                          <img src={series.coverImageUrl} alt={series.title} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="placeholder-cover">No Image</div>
                        )}
                      </div>
                      <div className="series-info">
                        <h4>{getDisplayTitle(favorite.seriesId)}</h4>
                        <p className="series-author">{series?.author || 'Unknown Author'}</p>
                        <p className="series-status">{series?.status || 'Unknown Status'}</p>
                        {lastRead && (
                          <p className="last-read">
                            Last read: Chapter {lastRead.chapterId.split('/').pop()?.replace('chapter-', '') || lastRead.chapterId}
                          </p>
                        )}
                        <p className="date-added">
                          Added: {favorite.dateAdded.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="series-actions">
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigation when clicking remove
                            handleRemoveFavorite(favorite.seriesId);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Downloads Section */}
          <section className="downloads-section">
            <h3>Downloads ({downloads.length})</h3>
            {downloads.length === 0 ? (
              <div className="content-placeholder">
                <p>No downloaded content yet. Download some series to read offline!</p>
              </div>
            ) : (
              <div className="series-grid">
                {downloads.map(download => {
                  const series = getSeriesById(download.seriesId);

                  return (
                    <div
                      key={download.seriesId}
                      className="series-card download"
                      onClick={() => handleReadSeries(download.seriesId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="series-cover">
                        {series?.coverImageUrl ? (
                          <img src={series.coverImageUrl} alt={series.title} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="placeholder-cover">No Image</div>
                        )}
                      </div>
                      <div className="series-info">
                        <h4>{getDisplayTitle(download.seriesId, download.downloadPath)}</h4>
                        <p className="series-author">{series?.author || 'Metadata Missing'}</p>
                        <p className="download-info">
                          {download.chapters.length} chapter(s) downloaded
                        </p>
                        <p className="download-date">
                          Downloaded: {download.downloadDate.toLocaleDateString()}
                        </p>
                        <p className="download-path" title={download.downloadPath}>
                          Path: {download.downloadPath}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Continue Reading Section */}
          <section className="reading-progress-section">
            <h3>Continue Reading</h3>
            {readingProgress.length === 0 ? (
              <div className="content-placeholder">
                <p>No reading progress yet. Start reading some series!</p>
              </div>
            ) : (
              <div className="progress-list">
                {Array.from(
                  readingProgress
                    .sort((a, b) => b.lastReadDate.getTime() - a.lastReadDate.getTime())
                    .reduce((map, item) => {
                      if (!map.has(item.seriesId)) {
                        map.set(item.seriesId, item);
                      }
                      return map;
                    }, new Map<string, ReadingProgress>())
                    .values()
                )
                  .slice(0, 3) // Show only 3 unique manga
                  .map(progress => {
                    const series = getSeriesById(progress.seriesId);
                    const download = downloads.find(d => d.seriesId === progress.seriesId);

                    return (
                      <div
                        key={`${progress.seriesId}-${progress.chapterId}`}
                        className="progress-item clickable"
                        onClick={() => handleReadChapterDirect(progress.seriesId, progress.chapterId, progress.pageNumber)}
                      >
                        <div className="progress-cover">
                          {series?.coverImageUrl ? (
                            <img src={series.coverImageUrl} alt={series.title} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="placeholder-cover">No Image</div>
                          )}
                        </div>
                        <div className="progress-info">
                          <h4>{getDisplayTitle(progress.seriesId, download?.downloadPath)}</h4>
                          <p>Chapter {progress.chapterId.split('/').pop()?.replace('chapter-', '') || progress.chapterId} - Page {progress.pageNumber}</p>
                          <p className="last-read-date">
                            Last read: {progress.lastReadDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="progress-actions">
                          <button
                            className="continue-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReadChapterDirect(progress.seriesId, progress.chapterId, progress.pageNumber);
                            }}
                          >
                            Continue Reading
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      </LoadingState>

      {readingChapterId && (
        <OnlineReader
          chapterId={readingChapterId}
          seriesId={readingSeriesId || undefined}
          initialPage={initialPage}
          onClose={handleCloseReader}
        />
      )}
    </div>
  );
};

export default LibraryPage;