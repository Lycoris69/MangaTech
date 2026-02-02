import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LatestRelease } from '../types';
import { ManhwazScraper } from '../services/scraper/ManhwazScraper';
import { LoadingSpinner } from './LoadingSpinner';
import { useNotifications } from './NotificationSystem';
import './LatestReleasesComponent.css';

interface LatestReleasesComponentProps {
  onSeriesClick?: (seriesUrl: string) => void;
  onChapterClick?: (chapterUrl: string) => void;
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export const LatestReleasesComponent: React.FC<LatestReleasesComponentProps> = ({
  onSeriesClick,
  onChapterClick,
  maxItems = 12,
  autoRefresh = true,
  refreshInterval = 30 * 60 * 1000 // 30 minutes default
}) => {
  const [latestReleases, setLatestReleases] = useState<LatestRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const scraper = useMemo(() => new ManhwazScraper(), []);
  const { error: showError } = useNotifications();

  const loadLatestReleases = useCallback(async () => {
    try {
      setError(null);
      const releases = await scraper.getLatestReleases();
      setLatestReleases(releases.slice(0, maxItems));
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load latest releases';
      setError(errorMessage);
      showError('Loading Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [maxItems, scraper, showError]);

  useEffect(() => {
    loadLatestReleases();
  }, [loadLatestReleases]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLatestReleases();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadLatestReleases]);

  const handleSeriesClick = (release: LatestRelease) => {
    if (onSeriesClick) {
      onSeriesClick(release.seriesUrl);
    }
  };

  const handleChapterClick = (release: LatestRelease, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onChapterClick) {
      onChapterClick(release.chapterUrl);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  if (loading) {
    return (
      <div className="latest-releases-component">
        <div className="section-header">
          <h3>Latest Releases</h3>
        </div>
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading latest releases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="latest-releases-component">
        <div className="section-header">
          <h3>Latest Releases</h3>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadLatestReleases} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="latest-releases-component">
      <div className="section-header">
        <h3>Latest Releases</h3>
        <div className="section-meta">
          {lastUpdated && (
            <span className="last-updated">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={loadLatestReleases}
            className="refresh-button"
            title="Refresh latest releases"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="releases-grid">
        {latestReleases.map((release) => (
          <div
            key={release.id}
            className="release-card"
            onClick={() => handleSeriesClick(release)}
          >
            <div className="release-cover">
              <img
                src={release.coverImageUrl}
                alt={release.seriesTitle}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-cover.svg';
                }}
              />
              {release.isNew && (
                <div className="new-badge">NEW</div>
              )}
            </div>

            <div className="release-info">
              <h4 className="series-title" title={release.seriesTitle}>
                {release.seriesTitle}
              </h4>

              <div className="chapter-info">
                <span className="chapter-number">Ch. {release.chapterNumber}</span>
                {release.chapterTitle && (
                  <span className="chapter-title" title={release.chapterTitle}>
                    {release.chapterTitle}
                  </span>
                )}
              </div>

              <div className="release-meta">
                <span className="publish-date">
                  {formatTimeAgo(release.publishDate)}
                </span>
                <button
                  className="read-button"
                  onClick={(e) => handleChapterClick(release, e)}
                  title="Read this chapter"
                >
                  Read
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {latestReleases.length === 0 && (
        <div className="empty-state">
          <p>No latest releases available</p>
          <button onClick={loadLatestReleases} className="retry-button">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default LatestReleasesComponent;