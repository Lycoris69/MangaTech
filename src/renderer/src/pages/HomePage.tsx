import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeriesSearchResult } from '../types';
import { SkeletonCard } from '../components/LoadingSpinner';
import { useNotifications } from '../components/NotificationSystem';
import { SeriesCard } from '../components/SeriesCard';
import { homeState } from '../services/HomeState';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [releases, setReleases] = useState<SeriesSearchResult[]>(homeState.releases);
  const [page, setPage] = useState(homeState.page);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(homeState.hasMore);
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
        setReleases((prev: SeriesSearchResult[]) => {
          const existingIds = new Set(prev.map((r: SeriesSearchResult) => r.id));
          const uniqueNew = newReleases.filter((r: SeriesSearchResult) => !existingIds.has(r.id));
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
    // If we have data already (from homeState), don't fetch page 1 again
    if (page === 1 && releases.length > 0) return;
    fetchReleases(page);
  }, [page]);

  // Update homeState when local state changes
  useEffect(() => {
    homeState.releases = releases;
    homeState.page = page;
    homeState.hasMore = hasMore;
  }, [releases, page, hasMore]);

  // Save scroll position on unmount or scroll
  useEffect(() => {
    const handleScroll = () => {
      homeState.scrollPosition = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restore scroll position on mount if we have one
  useEffect(() => {
    if (homeState.scrollPosition > 0) {
      // Small timeout to ensure rendering is complete
      setTimeout(() => {
        window.scrollTo(0, homeState.scrollPosition);
      }, 0);
    }
  }, []);

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

      <section className="content-section new-releases-section">
        <h3 className="section-title">✨ New Releases</h3>

        <div className="series-grid">
          {releases.map((item, index) => {
            const cardProps = {
              id: item.id,
              title: item.title,
              coverImageUrl: item.coverImageUrl,
              status: item.status,
              rating: item.rating,
              lastUpdated: item.lastUpdated, // Now available from SeriesSearchResult
              latestChapter: item.latestChapter,
              // Latest releases usually don't have totalChapters in the search result
              // We'll show what we have, or could fetch details if critical
              subtitle: item.genres?.slice(0, 2).join(', '),
              onClick: () => handleSeriesClick(item)
            };

            if (releases.length === index + 1) {
              return (
                <div ref={lastElementRef} key={item.id} className="card-wrapper">
                  <SeriesCard {...cardProps} />
                </div>
              );
            } else {
              return (
                <div key={item.id} className="card-wrapper">
                  <SeriesCard {...cardProps} />
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


export default HomePage;