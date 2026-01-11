import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeriesSearchResult } from '../types';
import { SkeletonCard } from '../components/LoadingSpinner';
import { useNotifications } from '../components/NotificationSystem';
import { errorService } from '../services/ErrorService';
import { ErrorType } from '../types/errors';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [releases, setReleases] = useState<SeriesSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const { error: showError } = useNotifications();
  const observer = useRef<IntersectionObserver | null>(null);
  const isFetching = useRef(false);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isFetching.current && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchReleases = async (pageNum: number) => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      console.log(`[HomePage] Fetching page ${pageNum}...`);
      const newReleases = await window.electronAPI.scraper.getLatestReleases(pageNum);

      if (!newReleases || newReleases.length === 0) {
        setHasMore(false);
      } else {
        setReleases(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = newReleases.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (err: any) {
      console.error(`[HomePage] Failed to fetch page ${pageNum}:`, err);
      setError('An error occurred while fetching updates.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchReleases(page);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSeriesClick = (series: SeriesSearchResult) => {
    navigate(`/series/${encodeURIComponent(series.id)}`);
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>MangaTech Nexus</h1>
          <p>The ultimate destination for your manga reading experience.</p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">🔍</button>
            </div>
          </form>
        </div>
      </div>

      <section className="content-section">
        <h3 className="section-title">✨ New Releases</h3>

        <div className="series-grid">
          {releases.map((item, index) => {
            if (releases.length === index + 1) {
              return (
                <div
                  ref={lastElementRef}
                  key={item.id}
                  className="series-card"
                  onClick={() => handleSeriesClick(item)}
                >
                  <SeriesCardContent item={item} />
                </div>
              );
            } else {
              return (
                <div
                  key={item.id}
                  className="series-card"
                  onClick={() => handleSeriesClick(item)}
                >
                  <SeriesCardContent item={item} />
                </div>
              );
            }
          })}
        </div>

        {loading && (
          <div className="series-grid" style={{ marginTop: '2rem' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="content-placeholder">
            <p>{error}</p>
            <button onClick={() => fetchReleases(page)} className="retry-button">
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !error && releases.length === 0 && (
          <div className="content-placeholder">
            <p>No recent releases found. Check back later! 🔎</p>
          </div>
        )}

        {!hasMore && releases.length > 0 && (
          <div className="end-of-content">
            <p>You've reached the end of the multiverse. 🌌</p>
          </div>
        )}
      </section>
    </div>
  );
};

const SeriesCardContent: React.FC<{ item: SeriesSearchResult }> = ({ item }) => (
  <>
    <div className="series-cover">
      <img
        src={item.coverImageUrl}
        alt={item.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder-cover.svg';
          target.onerror = null;
        }}
      />
      <div className="series-overlay">
        {item.rating > 0 && <div className="series-rating">★ {item.rating.toFixed(1)}</div>}
        <div className={`series-status status-${item.status.toLowerCase()}`}>{item.status}</div>
      </div>
    </div>
    <div className="series-info">
      <h4 className="series-title">{item.title}</h4>
      <div className="series-genres">
        {item.genres?.slice(0, 2).map((genre, index) => (
          <span key={index} className="genre-tag">{genre}</span>
        ))}
      </div>
    </div>
  </>
);

export default HomePage;