import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Series, Chapter, UserLibrary, DownloadTask } from '../types';
import { StorageService } from '../services/StorageService';
import { LibraryService } from '../services/LibraryService';
import OnlineReader from '../components/OnlineReader';
import './SeriesPage.css';

interface SeriesPageProps {
  onEnterReading?: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

const SeriesPage: React.FC<SeriesPageProps> = ({ onEnterReading }) => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();

  const [series, setSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [userLibrary, setUserLibrary] = useState<UserLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [showSynopsisModal, setShowSynopsisModal] = useState(false);
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [downloadedChapterIds, setDownloadedChapterIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [totalBatchChapters, setTotalBatchChapters] = useState(0);
  const [completedBatchChapters, setCompletedBatchChapters] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const storageService = new StorageService();
  const libraryService = new LibraryService();

  useEffect(() => {
    if (seriesId) {
      loadSeriesData(seriesId);
      loadUserLibrary();
    }
  }, [seriesId]);

  useEffect(() => {
    if (userLibrary && series) {
      // Use series.id instead of seriesId from URL to match the stored favorite
      const favorite = userLibrary.favorites.find(fav => fav.seriesId === series.id);
      setIsFavorite(!!favorite);

      // Sync downloaded chapters
      const downloadInfo = userLibrary.downloads.find(d => d.seriesId === series.id);
      if (downloadInfo) {
        const chapterIds = downloadInfo.chapters.map(c => typeof c === 'string' ? c : c.id);
        setDownloadedChapterIds(new Set(chapterIds));
      } else {
        setDownloadedChapterIds(new Set());
      }
    }
  }, [userLibrary, series]);

  // Restore active downloads on mount/series load
  useEffect(() => {
    if (series?.id) {
      loadActiveDownloads();
    }
  }, [series?.id]);

  const loadActiveDownloads = async () => {
    if (!series) return;
    try {
      const tasks: DownloadTask[] = await window.electronAPI.scraper.getDownloadTasks();
      const seriesTasks = tasks.filter(t => t.seriesId === series.id && (t.status === 'pending' || t.status === 'downloading'));

      if (seriesTasks.length > 0) {
        setIsBatchDownloading(true);
        setTotalBatchChapters(seriesTasks.length); // Approximation, ideally we'd know the original batch size

        // Find the currently downloading task
        const activeTask = seriesTasks.find(t => t.status === 'downloading');
        if (activeTask) {
          // Parse chapter ID from task ID (format: seriesId-chapterId)
          const chapterId = activeTask.id.replace(`${series.id}-`, '');
          setDownloadingChapterId(chapterId);
          setDownloadProgress(activeTask.progress);
        } else {
          // If all pending, set the first one
          const firstPending = seriesTasks[0];
          const chapterId = firstPending.id.replace(`${series.id}-`, '');
          setDownloadingChapterId(chapterId);
          setDownloadProgress(0);
        }

        // Count completed based on what's NOT in the pending list but IS in the original batch? 
        // We can't know the original batch size easily without persisting it elsewhere.
        // For now, let's just show progress of the *remaining* queue or what we can see.
        // A better approach for "Download All" persistence would be to store the "Batch ID" or similar.
        // But for this fix, we'll just ensure the progress bar shows *something* active.
      }
    } catch (err) {
      console.error('Failed to load active downloads:', err);
    }
  };

  useEffect(() => {
    // Listen for download progress updates from the main process
    const unsubscribe = window.electronAPI.on('download:tasks-updated', (tasks: DownloadTask[]) => {
      if (!series) return;

      // Look for tasks related to this series
      const seriesTasks = tasks.filter(t => t.seriesId === series.id);
      const activeTask = seriesTasks.find(t => t.status === 'downloading');

      if (activeTask) {
        // Parse chapter ID
        const chapterId = activeTask.id.replace(`${series.id}-`, '');

        // If we weren't tracking this download, start tracking it (persistence fix)
        if (downloadingChapterId !== chapterId) {
          setDownloadingChapterId(chapterId);
        }

        setDownloadProgress(activeTask.progress);

        // Update batch counts if we are in batch mode
        if (isBatchDownloading) {
          // If we just finished a chapter (it's gone from pending/downloading to completed, 
          // but we only get the *current* list often), we need to track completion.
          // Actually, the listener receives the *active* state.
          // A better way for the progress bar is:
          // We know which chapters we *wanted* to download.
          // We can check `downloadedChapterIds` vs our `chapters` list to see how many are done.
        }
      } else if (downloadingChapterId) {
        // If we were downloading something and it's no longer "downloading" (e.g. completed or failed)
        // Check if it completed
        const completedTask = tasks.find(t => t.id === `${series.id}-${downloadingChapterId}` && t.status === 'completed');
        if (completedTask) {
          setDownloadProgress(100);
          setCompletedBatchChapters(prev => prev + 1);
          setDownloadingChapterId(null); // Clear it so we pick up the next one
        }
      }
    });

    return () => unsubscribe();
  }, [series, downloadingChapterId, isBatchDownloading]);

  const loadSeriesData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading series details for:', id);

      const decodedId = decodeURIComponent(id);

      const seriesDetails = await window.electronAPI.scraper.getSeriesDetails(decodedId);
      console.log('Series details loaded:', seriesDetails);

      setSeries(seriesDetails);

      if (seriesDetails.chapters) {
        setChapters(seriesDetails.chapters);
      } else {
        setChapters([]);
      }

    } catch (err: any) {
      console.error('Failed to load series data:', err);
      setError(err.message || 'Failed to load series data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLibrary = async () => {
    try {
      await storageService.initialize();
      const library = await storageService.loadUserLibrary();
      setUserLibrary(library);
    } catch (err) {
      console.error('Failed to load user library:', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!seriesId || !series) return;
    try {
      // FIX: Ensure series metadata is saved before adding to favorites
      // This allows the LibraryPage to display title/cover/etc.
      await storageService.upsertSeries(series);

      // CRITICAL FIX: Use series.id (from scraper) instead of seriesId (from URL)
      // The scraper returns the actual ID without the ManhwaZ: prefix
      const newFavoriteStatus = await libraryService.toggleFavorite(series.id);
      setIsFavorite(newFavoriteStatus);
      const updatedLibrary = await storageService.loadUserLibrary();
      setUserLibrary(updatedLibrary);
    } catch (err) {
      console.error('Failed to update favorites:', err);
    }
  };

  const handleReadOnline = (chapter: any) => {
    // Priority: chapterUrl (from scraper), then sourceUrl (from Chapter type), then id
    const idToRead = chapter.chapterUrl || chapter.sourceUrl || chapter.id;

    if (seriesId && onEnterReading) {
      onEnterReading(seriesId, idToRead, 1);
    } else {
      setReadingChapterId(idToRead);
    }
  };

  const handleCloseReader = () => {
    setReadingChapterId(null);
  };

  const handleDownloadChapter = async (chapter: any) => {
    if (downloadingChapterId || !series || !seriesId) return;

    try {
      // Ensure metadata is saved so it shows up correctly in the library
      await storageService.upsertSeries(series);

      const destPath = await window.electronAPI.dialog.selectDirectory();
      if (!destPath) return;

      setDownloadingChapterId(chapter.id);
      setDownloadProgress(0);

      const idToDownload = chapter.chapterUrl || chapter.sourceUrl || chapter.id;

      const result = await window.electronAPI.scraper.downloadChapter({
        seriesId: series.id,
        chapterId: idToDownload,
        seriesTitle: series.title,
        chapterTitle: `Chapter ${chapter.chapterNumber}`,
        basePath: destPath
      });

      // Register download in library for offline reading
      await libraryService.registerDownload(series.id, chapter.id, result);

      // Refresh the library state to reflect changes
      await loadUserLibrary();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please check your connection and try again.');
    } finally {
      setDownloadingChapterId(null);
      setDownloadProgress(0);
    }
  };

  const handleDownloadAll = async () => {
    if (isBatchDownloading || downloadingChapterId || !series || chapters.length === 0) return;

    try {
      // Ensure metadata is saved
      await storageService.upsertSeries(series);

      const destPath = await window.electronAPI.dialog.selectDirectory();
      if (!destPath) return;

      setIsBatchDownloading(true);

      // Filter out already downloaded chapters
      const toDownload = chapters.filter(c => !downloadedChapterIds.has(c.id));

      if (toDownload.length === 0) {
        alert('All chapters are already downloaded!');
        setIsBatchDownloading(false);
        return;
      }

      setTotalBatchChapters(toDownload.length);
      setCompletedBatchChapters(0);
      console.log(`Starting batch download of ${toDownload.length} chapters`);

      for (const chapter of toDownload) {
        setDownloadingChapterId(chapter.id);
        const idToDownload = chapter.chapterUrl || chapter.sourceUrl || chapter.id;

        try {
          const result = await window.electronAPI.scraper.downloadChapter({
            seriesId: series.id,
            chapterId: idToDownload,
            seriesTitle: series.title,
            chapterTitle: `Chapter ${chapter.chapterNumber}`,
            basePath: destPath
          });

          await libraryService.registerDownload(series.id, chapter.id, result);
          setCompletedBatchChapters(prev => prev + 1);
        } catch (err) {
          console.error(`Failed to download chapter ${chapter.chapterNumber}:`, err);
          // Continue with next chapter even if one fails
          setCompletedBatchChapters(prev => prev + 1);
        }
      }

      await loadUserLibrary();
      alert('Download All completed!');
    } catch (error) {
      console.error('Batch download failed:', error);
      alert('Batch download encountered an error.');
    } finally {
      setIsBatchDownloading(false);
      setDownloadingChapterId(null);
      setTotalBatchChapters(0);
      setCompletedBatchChapters(0);
    }
  };

  if (loading) {
    return (
      <div className="series-page loading">
        <div className="loading-spinner"></div>
        <p>Retrieving series data from archives...</p>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="series-page error">
        <h2>Error Loading Series</h2>
        <p>{error || 'Series not found'}</p>
        <button onClick={() => navigate(-1)} className="back-button">Go Back</button>
      </div>
    );
  }

  const allSortedChapters = [...chapters].sort((a, b) => {
    const aNum = parseFloat(a.chapterNumber.toString()) || 0;
    const bNum = parseFloat(b.chapterNumber.toString()) || 0;
    return sortDesc ? bNum - aNum : aNum - bNum;
  });

  const displayedChapters = isExpanded ? allSortedChapters : allSortedChapters.slice(0, 20);
  const allChaptersDownloaded = chapters.length > 0 && chapters.every(c => downloadedChapterIds.has(c.id));

  return (
    <div className="series-page">
      <div className="series-header-section">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>

        <div className="series-hero">
          <div className="series-poster-container">
            <div className="series-poster">
              <img
                src={series.coverImageUrl}
                alt={series.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-cover.svg';
                }}
              />
            </div>
          </div>

          <div className="series-details-main">
            <h1 className="series-title">{series.title}</h1>
            <div className="series-meta-row">
              {series.author && series.author !== 'Unknown' && (
                <span className="author">By {series.author}</span>
              )}
              <span className={`status-badge ${series.status.toLowerCase()}`}>{series.status}</span>
            </div>

            <div className="genre-list">
              {series.genres?.map(g => <span key={g} className="genre-chip">{g}</span>)}
            </div>

            <div
              className="series-synopsis clickable"
              onClick={() => setShowSynopsisModal(true)}
              title="Click to view full synopsis"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Synopsis</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--cyber-purple-bright)', opacity: 0.7 }}>[EXPAND]</span>
              </div>
              <p>{series.synopsis || 'No synopsis available.'}</p>
            </div>

            <div className="action-buttons">
              <button
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={handleToggleFavorite}
              >
                {isFavorite ? 'Remove from Library' : 'Add to Library'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="chapters-container">
        <div className="chapters-header">
          <h3>Chapters ({chapters.length})</h3>
          <div className="chapters-header-actions">
            {isBatchDownloading && (
              <div className="batch-progress-container">
                <div className="batch-progress-info">
                  <span>Downloading {completedBatchChapters + 1} / {totalBatchChapters}</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="batch-progress-bar-bg">
                  <div
                    className="batch-progress-bar-fill"
                    style={{
                      width: `${((completedBatchChapters + (downloadProgress / 100)) / totalBatchChapters) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
            {!allChaptersDownloaded && (
              <button
                className={`download-all-btn ${isBatchDownloading ? 'loading' : ''}`}
                onClick={handleDownloadAll}
                disabled={isBatchDownloading || !!downloadingChapterId}
              >
                {isBatchDownloading ? 'Downloading...' : 'Download All'}
              </button>
            )}
            <button
              className="sort-btn"
              onClick={() => setSortDesc(!sortDesc)}
            >
              Sort: {sortDesc ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        <div className="chapters-list">
          {displayedChapters.map((chapter) => (
            <div key={chapter.id} className="chapter-item">
              <div className="chapter-info" onClick={() => handleReadOnline(chapter)}>
                <span className="chapter-name">
                  {chapter.title || `Chapter ${chapter.chapterNumber}`}
                </span>
              </div>
              <div className="chapter-actions">
                <button
                  className={`download-btn ${downloadingChapterId === chapter.id ? 'loading' : ''} ${downloadedChapterIds.has(chapter.id) ? 'downloaded' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleDownloadChapter(chapter); }}
                  disabled={!!downloadingChapterId || downloadedChapterIds.has(chapter.id)}
                >
                  {downloadingChapterId === chapter.id ? 'Downloading...' :
                    downloadedChapterIds.has(chapter.id) ? 'Saved' : 'Download'}
                </button>
                <button className="read-btn" onClick={() => handleReadOnline(chapter)}>Read</button>
              </div>
            </div>
          ))}
        </div>

        {!isExpanded && chapters.length > 20 && (
          <div className="show-more-container">
            <button className="show-more-btn" onClick={() => setIsExpanded(true)}>
              Show All Chapters ({chapters.length})
            </button>
          </div>
        )}
      </div>

      {readingChapterId && (
        <OnlineReader
          chapterId={readingChapterId}
          seriesId={series.id}
          onClose={handleCloseReader}
        />
      )}

      {showSynopsisModal && (
        <div className="modal-backdrop" onClick={() => setShowSynopsisModal(false)}>
          <div className="modal-content synopsis-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Synopsis</h3>
              <button className="close-modal-btn" onClick={() => setShowSynopsisModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>{series.synopsis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesPage;