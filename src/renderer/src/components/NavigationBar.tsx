import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useModeManager } from '../hooks/useModeManager';
import './NavigationBar.css';

interface NavigationBarProps {
  onEnterReading: (seriesId: string, chapterId: string, pageNumber?: number) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onEnterReading }) => {
  const location = useLocation();
  const { resumeReading, context, preferences } = useModeManager();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleResumeReading = async () => {
    const resumedContext = await resumeReading();
    if (!resumedContext && context.readingContext) {
      // Fallback to last reading context if available
      onEnterReading(
        context.readingContext.seriesId,
        context.readingContext.chapterId,
        context.readingContext.pageNumber
      );
    }
  };

  const hasReadingContext = context.readingContext || context.previousMode === 'reading';

  return (
    <nav className="navigation-bar theme-transition">
      <div className="nav-brand">
        <Link to="/" className="brand-link">
          <h1>MangaTech</h1>
        </Link>
      </div>

      <div className="nav-links">
        <Link 
          to="/" 
          className={`nav-link ${isActive('/') ? 'active' : ''}`}
        >
          Home
        </Link>
        <Link 
          to="/library" 
          className={`nav-link ${isActive('/library') ? 'active' : ''}`}
        >
          Library
        </Link>
        <Link 
          to="/search" 
          className={`nav-link ${isActive('/search') ? 'active' : ''}`}
        >
          Search
        </Link>
      </div>

      <div className="nav-controls">
        {hasReadingContext && (
          <button 
            className="resume-reading-button"
            onClick={handleResumeReading}
            title="Resume last reading session"
          >
            📖 Resume Reading
          </button>
        )}
        
        {preferences && (
          <div className="preferences-indicator" title="User preferences loaded">
            <span className="preference-badge">
              {preferences.readingMode === 'single-page' ? '📄' : '📖'}
            </span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationBar;