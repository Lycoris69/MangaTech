import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryService } from '../services/LibraryService';
import { StorageService } from '../services/StorageService';
import { FavoriteSeries, DownloadedSeries, ReadingProgress, Series } from '../types';
import { LoadingState, SkeletonCard } from '../components/LoadingSpinner';
import { useNotifications } from '../components/NotificationSystem';
import { errorService } from '../services/ErrorService';
import { ErrorType } from '../types/errors';
import OnlineReader from '../components/OnlineReader';
import { SeriesCard } from '../components/SeriesCard';
import './LibraryPage.css';

interface LibraryPageProps {
  onEnterReading?: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onEnterReading }) => {
  const [favorites, setFavorites] = useState<FavoriteSeries[]>([]);
  const [downloads, setDownloads] = useState<DownloadedSeries[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [seriesMetadata, setSeriesMetadata] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [readingSeriesId, setReadingSeriesId] = useState<string | null>(null);
  const [initialPage, setInitialPage] = useState(1);

  const libraryService = new LibraryService();
  const storageService = new StorageService();
  const { success: showSuccess, error: showError } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    loadLibraryData();
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

  const handleDownloadSeries = async (seriesId: string) => {
    try {
      if (!window.electronAPI?.scraper || !window.electronAPI?.dialog) return;

      const series = getSeriesById(seriesId);
      if (!series) {
        showError('Metadata missing', 'Cannot download a series without metadata.');
        return;
      }

      const destPath = await window.electronAPI.dialog.selectDirectory();
      if (!destPath) return;

      showSuccess('Download started', `Targeting: ${series.title}`);

      // 1. Fetch full details to get all chapters if not present
      let fullSeries = series;
      if (!series.chapters || series.chapters.length === 0) {
        fullSeries = await window.electronAPI.scraper.getSeriesDetails(series.id);
        await storageService.upsertSeries(fullSeries);
      }

      // 2. Trigger downloads for all chapters
      if (fullSeries.chapters) {
        for (const chapter of fullSeries.chapters) {
          const idToDownload = (chapter as any).chapterUrl || (chapter as any).sourceUrl || chapter.id;

          // We call it without awaiting individual completions to trigger the queue
          window.electronAPI.scraper.downloadChapter({
            seriesId: fullSeries.id,
            chapterId: idToDownload,
            seriesTitle: fullSeries.title,
            chapterTitle: `Chapter ${chapter.chapterNumber}`,
            basePath: destPath
          }).then(async (result: { chapterPath: string, seriesPath: string }) => {
            await libraryService.registerDownload(fullSeries.id, chapter.id, result);
          }).catch(err => console.error(`Failed to download chapter ${chapter.id}:`, err));
        }
      }

      // 3. Remove from favorites as requested
      await handleRemoveFavorite(seriesId);

      showSuccess('Serie queued', 'The series has been queued for download and removed from favorites.');
    } catch (err) {
      console.error('Failed to start series download:', err);
      showError('Download Failed', 'An error occurred while starting the download.');
    }
  };

  const handleScanDownloads = async () => {
    try {
      if (!window.electronAPI?.dialog) return;

      const selectedPath = await window.electronAPI.dialog.selectDirectory();
      if (!selectedPath) return;

      setRefreshing(true);
      const count = await libraryService.importLocalDownloads(selectedPath);
      await loadLibraryData(true);

      if (count > 0) {
        showSuccess('Scan Complete', `Successfully imported ${count} series from local downloads.`);
      } else {
        showError('No Downloads Found', 'The selected directory does not appear to contain any recognized manga series or chapters. Ensure the folders contain image files.');
      }
    } catch (err) {
      console.error('Failed to scan downloads:', err);
      showError('Failed to scan downloads', 'An error occurred while scanning the directory.');
    } finally {
      setRefreshing(false);
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
        // Extract IDs for sorting and reading
        const chapterIds = download.chapters.map(c => typeof c === 'string' ? c : c.id);
        // Sort chapters to find the "first" one (heuristic: lowest number/name)
        const sortedChapters = [...chapterIds].sort();
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



  const getLatestChapter = (series: Series | null): string | undefined => {
    if (!series || !series.chapters || series.chapters.length === 0) return undefined;

    // Try to find the chapter with the highest number
    try {
      // Sort copies to avoid mutating original array
      const sorted = [...series.chapters].sort((a, b) => {
        const numA = parseFloat(a.chapterNumber) || 0;
        const numB = parseFloat(b.chapterNumber) || 0;
        return numB - numA;
      });
      return sorted[0]?.chapterNumber;
    } catch (e) {
      // Fallback if sorting fails (e.g. non-numeric chapters)
      return series.chapters[series.chapters.length - 1]?.chapterNumber;
    }
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
            <button
              onClick={handleScanDownloads}
              disabled={refreshing}
              className="scan-button"
            >
              📂 Scan Downloads
            </button>
          </div>

        </div>

        {/* Notifications Section */}


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
                    <div key={favorite.seriesId} className="series-card-wrapper">
                      <SeriesCard
                        id={favorite.seriesId}
                        title={getDisplayTitle(favorite.seriesId)}
                        coverImageUrl={series?.coverImageUrl || ''}
                        totalChapters={series?.chapters?.length}
                        lastUpdated={series?.lastUpdated ? new Date(series.lastUpdated) : undefined}
                        status={series?.status}
                        rating={series?.rating}
                        onClick={() => navigate(`/series/${encodeURIComponent(favorite.seriesId)}`)}
                        actions={
                          <div className="card-actions-row">
                            <button
                              className="download-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadSeries(favorite.seriesId);
                              }}
                            >
                              Download
                            </button>
                            <button
                              className="remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFavorite(favorite.seriesId);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        }
                        latestChapter={getLatestChapter(series)}
                      />
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
                    <div key={download.seriesId} className="series-card-wrapper">
                      <SeriesCard
                        id={download.seriesId}
                        title={getDisplayTitle(download.seriesId, download.downloadPath)}
                        coverImageUrl={series?.coverImageUrl || ''}
                        totalChapters={download.chapters.length}
                        lastUpdated={download.downloadDate}
                        status="Downloaded"
                        onClick={() => handleReadSeries(download.seriesId)}
                        customStat={`${download.chapters.length} DLs`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section >

          {/* Continue Reading Section */}
          < section className="reading-progress-section" >
            <h3>Continue Reading</h3>
            {
              readingProgress.length === 0 ? (
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
              )
            }
          </section >
        </div >
      </LoadingState >

      {readingChapterId && (
        <OnlineReader
          chapterId={readingChapterId}
          seriesId={readingSeriesId || undefined}
          initialPage={initialPage}
          onClose={handleCloseReader}
        />
      )}
    </div >
  );
};

export default LibraryPage;