import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HotScan } from '../types';
import { ManhwazScraper } from '../services/scraper/ManhwazScraper';
import { LoadingSpinner } from './LoadingSpinner';
import { useNotifications } from './NotificationSystem';
import './HotScansComponent.css';

interface HotScansComponentProps {
  onSeriesClick?: (seriesUrl: string) => void;
  maxItems?: number;
  showRankings?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export const HotScansComponent: React.FC<HotScansComponentProps> = ({
  onSeriesClick,
  maxItems = 10,
  showRankings = true,
  autoRefresh = true,
  refreshInterval = 30 * 60 * 1000 // 30 minutes default
}) => {
  const [hotScans, setHotScans] = useState<HotScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const scraper = useMemo(() => new ManhwazScraper(), []);
  const { error: showError } = useNotifications();

  const loadHotScans = useCallback(async () => {
    try {
      setError(null);
      const hotScansExtractor = scraper.getHotScansExtractor();
      const scans = await hotScansExtractor.extractHotScans();

      // Sort by rank and limit results
      const sortedScans = scans
        .sort((a: HotScan, b: HotScan) => a.rank - b.rank)
        .slice(0, maxItems);

      setHotScans(sortedScans);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hot scans';
      setError(errorMessage);
      showError('Loading Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [maxItems, scraper, showError]);

  useEffect(() => {
    loadHotScans();
  }, [loadHotScans]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadHotScans();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadHotScans]);

  const handleSeriesClick = (hotScan: HotScan) => {
    if (onSeriesClick) {
      onSeriesClick(hotScan.seriesUrl);
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getRankBadgeClass = (rank: number): string => {
    if (rank <= 3) return 'rank-badge top-three';
    if (rank <= 10) return 'rank-badge top-ten';
    return 'rank-badge';
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
      <div className="hot-scans-component">
        <div className="section-header">
          <h3>🔥 Hot Scans</h3>
        </div>
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading trending content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hot-scans-component">
        <div className="section-header">
          <h3>🔥 Hot Scans</h3>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadHotScans} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hot-scans-component">
      <div className="section-header">
        <h3>🔥 Hot Scans</h3>
        <div className="section-meta">
          {lastUpdated && (
            <span className="last-updated">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={loadHotScans}
            className="refresh-button"
            title="Refresh hot scans"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="hot-scans-grid">
        {hotScans.map((hotScan) => (
          <div
            key={hotScan.id}
            className="hot-scan-card"
            onClick={() => handleSeriesClick(hotScan)}
          >
            {showRankings && (
              <div className={getRankBadgeClass(hotScan.rank)}>
                #{hotScan.rank}
              </div>
            )}

            <div className="scan-cover">
              <img
                src={hotScan.coverImageUrl}
                alt={hotScan.seriesTitle}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-cover.svg';
                }}
              />
              <div className="scan-overlay">
                <div className="rating-badge">
                  ★ {hotScan.rating.toFixed(1)}
                </div>
                <div className="status-badge">
                  {hotScan.status}
                </div>
              </div>
            </div>

            <div className="scan-info">
              <h4 className="series-title" title={hotScan.seriesTitle}>
                {hotScan.seriesTitle}
              </h4>

              <div className="scan-stats">
                <div className="view-count">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  {formatViewCount(hotScan.viewCount)}
                </div>

                <div className="last-chapter">
                  Ch. {hotScan.lastChapter}
                </div>
              </div>

              <div className="scan-genres">
                {hotScan.genres.slice(0, 2).map((genre, index) => (
                  <span key={index} className="genre-tag">
                    {genre}
                  </span>
                ))}
                {hotScan.genres.length > 2 && (
                  <span className="genre-more">
                    +{hotScan.genres.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hotScans.length === 0 && (
        <div className="empty-state">
          <p>No trending content available</p>
          <button onClick={loadHotScans} className="retry-button">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default HotScansComponent;