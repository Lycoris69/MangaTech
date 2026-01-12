import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SeriesSearchResult } from '../types';
import { SeriesCard } from '../components/SeriesCard';
import { LoadingState } from '../components/LoadingSpinner';
import { useNotifications } from '../components/NotificationSystem';
import { errorService } from '../services/ErrorService';
import { ErrorType } from '../types/errors';
import './SearchPage.css';

interface SearchPageProps {
  onEnterReading?: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

const SearchPage: React.FC<SearchPageProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<SeriesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const { error: showError, success: showSuccess } = useNotifications();

  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query !== searchQuery) {
      setSearchQuery(query);
      performSearch(query);
    } else if (query) {
      // Initial load with query param
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      console.log(`Searching for: ${query}`);
      const results = await window.electronAPI.scraper.searchSeries(query.trim());
      console.log('Search results:', results);

      setSearchResults(results);

      if (results.length === 0) {
        showSuccess('Search completed', `No results found for "${query}".`);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      const appError = errorService.createError(
        ErrorType.SCRAPING,
        'Search failed',
        {
          details: err instanceof Error ? err.message : 'Unknown error',
          retryable: true,
          context: { component: 'SearchPage', query }
        }
      );

      setError(appError.userMessage);

      showError(
        'Search failed',
        'Unable to search for manga. Please check your internet connection and try again.',
        {
          actions: [
            {
              label: 'Retry',
              action: () => performSearch(query),
              primary: true
            }
          ]
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();

    if (query) {
      setSearchParams({ q: query });
      // performSearch is triggered by useEffect on searchParams change
    }
  };

  const handleSeriesClick = (series: SeriesSearchResult) => {
    navigate(`/series/${encodeURIComponent(series.id)}`);
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h2>Search Database</h2>
        <p>Find manga by title, author, or genre</p>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Enter keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            disabled={loading}
          />
          <button
            type="submit"
            className="search-button"
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? 'Scanning...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="search-results-container">
        <LoadingState
          loading={loading}
          error={error}
          loadingMessage="Scanning Archives..."
          errorMessage={error || undefined}
          onRetry={() => performSearch(searchQuery)}
        >
          {hasSearched && searchResults.length > 0 && (
            <>
              <div className="results-header">
                <h3>Found {searchResults.length} matches</h3>
              </div>

              <div className="results-grid">
                {searchResults.map((series) => (
                  <div key={series.id}>
                    <SeriesCard
                      id={series.id}
                      title={series.title}
                      coverImageUrl={series.coverImageUrl}
                      status={series.status}
                      rating={series.rating}
                      lastUpdated={series.lastUpdated}
                      latestChapter={series.latestChapter}
                      subtitle={series.genres?.slice(0, 2).join(', ')}
                      onClick={() => handleSeriesClick(series)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {hasSearched && searchResults.length === 0 && !loading && !error && (
            <div className="no-results">
              <div className="no-results-icon">❌</div>
              <h3>No Matches Found</h3>
              <p>The system could not find any records matching "{searchParams.get('q')}".</p>
              <p>Try refining your search terms.</p>
            </div>
          )}

          {!hasSearched && (
            <div className="search-placeholder">
              <div className="placeholder-icon">🔍</div>
              <h3>Ready to Scan</h3>
              <p>Input keywords to search the entire ManhwaZ database.</p>
            </div>
          )}
        </LoadingState>
      </div>
    </div>
  );
};

export default SearchPage;