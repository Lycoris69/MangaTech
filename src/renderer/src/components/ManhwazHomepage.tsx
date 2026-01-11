import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LatestReleasesComponent } from './LatestReleasesComponent';
import { HotScansComponent } from './HotScansComponent';
import { SearchBarComponent } from './SearchBarComponent';
import { AutocompleteResult } from '../services/SearchInterface';
import './ManhwazHomepage.css';

interface ManhwazHomepageProps {
  onEnterReading?: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

export const ManhwazHomepage: React.FC<ManhwazHomepageProps> = ({ onEnterReading }) => {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSuggestionClick = (suggestion: AutocompleteResult) => {
    if (suggestion.type === 'series') {
      // Navigate to search results for the series
      navigate(`/search?q=${encodeURIComponent(suggestion.suggestion)}`);
    } else if (suggestion.type === 'author') {
      // Navigate to search results filtered by author
      navigate(`/search?q=${encodeURIComponent(suggestion.suggestion)}&type=author`);
    } else if (suggestion.type === 'genre') {
      // Navigate to search results filtered by genre
      navigate(`/search?q=${encodeURIComponent(suggestion.suggestion)}&type=genre`);
    }
  };

  const handleSeriesClick = (seriesUrl: string) => {
    // Extract series ID from URL and navigate to series page
    const seriesId = seriesUrl.split('/').pop() || seriesUrl;
    navigate(`/series/${seriesId}`);
  };

  const handleChapterClick = (chapterUrl: string) => {
    // Extract chapter info and navigate to reading mode
    const chapterId = chapterUrl.split('/').pop() || chapterUrl;
    if (onEnterReading) {
      // For now, use placeholder series ID - this would be extracted from the chapter URL in a real implementation
      onEnterReading('placeholder-series', chapterId, 1);
    } else {
      navigate(`/read/${chapterId}`);
    }
  };

  return (
    <div className="manhwaz-homepage">
      {/* Hero Section with Search */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="site-title">MangaTech</h1>
          <p className="site-subtitle">
            Discover the latest manga, manhua, and webtoons from manhwaz.com
          </p>
          
          <div className="hero-search">
            <SearchBarComponent
              onSearch={handleSearch}
              onSuggestionClick={handleSuggestionClick}
              placeholder="Search thousands of manga titles..."
              autoFocus={false}
              showRecentSearches={true}
              maxSuggestions={8}
              className="hero-search-bar"
            />
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Manga Series</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">500K+</span>
              <span className="stat-label">Chapters</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">Daily</span>
              <span className="stat-label">Updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="main-content">
        {/* Hot Scans Section */}
        <section className="content-section hot-scans-section">
          <HotScansComponent
            onSeriesClick={handleSeriesClick}
            maxItems={12}
            showRankings={true}
            autoRefresh={true}
            refreshInterval={30 * 60 * 1000} // 30 minutes
          />
        </section>

        {/* Latest Releases Section */}
        <section className="content-section latest-releases-section">
          <LatestReleasesComponent
            onSeriesClick={handleSeriesClick}
            onChapterClick={handleChapterClick}
            maxItems={18}
            autoRefresh={true}
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </section>

        {/* Additional Features Section */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Vast Library</h3>
              <p>Access thousands of manga, manhua, and webtoons from manhwaz.com</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Real-time Updates</h3>
              <p>Get the latest chapters as soon as they're published</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Smart Search</h3>
              <p>Find exactly what you're looking for with intelligent search and filters</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>Enjoy seamless reading experience across all your devices</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-content">
          <p>
            Content sourced from{' '}
            <a 
              href="https://manhwaz.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-link"
            >
              manhwaz.com
            </a>
          </p>
          <p className="disclaimer">
            This application respects the source website's terms of service and implements 
            appropriate rate limiting to ensure responsible usage.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ManhwazHomepage;