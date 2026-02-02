import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ManhwazScraper } from '../services/scraper/ManhwazScraper';
import { AutocompleteResult } from '../services/SearchInterface';
import { useNotifications } from './NotificationSystem';
import './SearchBarComponent.css';

interface SearchBarComponentProps {
  onSearch?: (query: string) => void;
  onSuggestionClick?: (suggestion: AutocompleteResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  className?: string;
}

export const SearchBarComponent: React.FC<SearchBarComponentProps> = ({
  onSearch,
  onSuggestionClick,
  placeholder = "Search for manga, manhua, or webtoons...",
  autoFocus = false,
  showRecentSearches = true,
  maxSuggestions = 8,
  debounceMs = 300,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const scraper = useRef(new ManhwazScraper());

  const { error: showError } = useNotifications();

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      const saved = localStorage.getItem('manhwaz-recent-searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (err) {
          console.warn('Failed to parse recent searches:', err);
        }
      }
    }
  }, [showRecentSearches]);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced autocomplete function
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = await scraper.current.getAutocompleteSuggestions(searchQuery.trim());
      setSuggestions(results.slice(0, maxSuggestions));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(errorMessage);
      setSuggestions([]);

      // Only show error notification for non-trivial errors
      if (searchQuery.trim().length >= 3) {
        showError('Search Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [maxSuggestions, showError]);

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set up new debounce
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newQuery);
    }, debounceMs);

    // Show suggestions dropdown if query is not empty
    setShowSuggestions(newQuery.trim().length > 0);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      showError('Search Required', 'Please enter a search term.');
      return;
    }

    if (trimmedQuery.length < 2) {
      showError('Search Too Short', 'Please enter at least 2 characters.');
      return;
    }

    // Add to recent searches
    if (showRecentSearches) {
      const updatedRecent = [
        trimmedQuery,
        ...recentSearches.filter(s => s !== trimmedQuery)
      ].slice(0, 10); // Keep only 10 recent searches

      setRecentSearches(updatedRecent);
      localStorage.setItem('manhwaz-recent-searches', JSON.stringify(updatedRecent));
    }

    // Hide suggestions and call search handler
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(trimmedQuery);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: AutocompleteResult) => {
    setQuery(suggestion.suggestion);
    setShowSuggestions(false);

    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else if (onSearch) {
      onSearch(suggestion.suggestion);
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setShowSuggestions(false);

    if (onSearch) {
      onSearch(recentQuery);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const totalItems = suggestions.length + (showRecentSearches ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < suggestions.length) {
            handleSuggestionClick(suggestions[selectedIndex]);
          } else if (showRecentSearches) {
            const recentIndex = selectedIndex - suggestions.length;
            handleRecentSearchClick(recentSearches[recentIndex]);
          }
        } else {
          handleSubmit(e);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (query.trim().length > 0 || (showRecentSearches && recentSearches.length > 0)) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('manhwaz-recent-searches');
  };

  return (
    <div className={`search-bar-component ${className}`}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
            spellCheck="false"
          />

          <button
            type="submit"
            className="search-button"
            disabled={!query.trim() || loading}
            title="Search"
          >
            {loading ? (
              <div className="search-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
          </button>
        </div>

        {showSuggestions && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            {error && (
              <div className="suggestion-error">
                <span>⚠️ {error}</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="suggestions-section">
                <div className="suggestions-header">Suggestions</div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`suggestion-${index}`}
                    className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                      </svg>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title">{suggestion.suggestion}</div>
                      {suggestion.count && (
                        <div className="suggestion-author">{suggestion.count} results</div>
                      )}
                    </div>
                    {suggestion.type && (
                      <div className="suggestion-type">{suggestion.type}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showRecentSearches && recentSearches.length > 0 && (
              <div className="suggestions-section">
                <div className="suggestions-header">
                  Recent Searches
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="clear-recent-button"
                    title="Clear recent searches"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.slice(0, 5).map((recentQuery, index) => {
                  const actualIndex = suggestions.length + index;
                  return (
                    <div
                      key={`recent-${index}`}
                      className={`suggestion-item recent-item ${selectedIndex === actualIndex ? 'selected' : ''}`}
                      onClick={() => handleRecentSearchClick(recentQuery)}
                    >
                      <div className="suggestion-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-title">{recentQuery}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && suggestions.length === 0 && query.trim().length >= 2 && !error && (
              <div className="no-suggestions">
                <span>No suggestions found for "{query}"</span>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBarComponent;