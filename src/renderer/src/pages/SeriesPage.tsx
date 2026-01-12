import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Series, Chapter, UserLibrary } from '../types';
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
        } catch (err) {
          console.error(`Failed to download chapter ${chapter.chapterNumber}:`, err);
          // Continue with next chapter even if one fails
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

  const sortedChapters = [...chapters].sort((a, b) => {
    const aNum = parseFloat(a.chapterNumber.toString()) || 0;
    const bNum = parseFloat(b.chapterNumber.toString()) || 0;
    return sortDesc ? bNum - aNum : aNum - bNum;
  });

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
            <button
              className={`download-all-btn ${isBatchDownloading ? 'loading' : ''}`}
              onClick={handleDownloadAll}
              disabled={isBatchDownloading || !!downloadingChapterId}
            >
              {isBatchDownloading ? 'Downloading All...' : 'Download All'}
            </button>
            <button
              className="sort-btn"
              onClick={() => setSortDesc(!sortDesc)}
            >
              Sort: {sortDesc ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        <div className="chapters-list">
          {sortedChapters.map((chapter) => (
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