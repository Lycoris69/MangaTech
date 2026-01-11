import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock the ScraperManager to avoid actual web scraping in tests
jest.mock('./services/ScraperManager', () => {
  return {
    ScraperManager: jest.fn().mockImplementation(() => ({
      getTrendingContent: jest.fn().mockResolvedValue({
        hotSeries: [
          {
            id: 'test-series-1',
            title: 'Test Manga 1',
            author: 'Test Author 1',
            coverImageUrl: 'test-cover-1.jpg',
            synopsis: 'Test synopsis 1',
            genres: ['Action', 'Adventure'],
            status: 'ongoing',
            rating: 4.5,
            sourceUrl: 'test-url-1'
          }
        ],
        latestReleases: [
          {
            id: 'test-series-2',
            title: 'Test Manga 2',
            author: 'Test Author 2',
            coverImageUrl: 'test-cover-2.jpg',
            synopsis: 'Test synopsis 2',
            genres: ['Romance', 'Drama'],
            status: 'completed',
            rating: 4.2,
            sourceUrl: 'test-url-2'
          }
        ],
        mostViewed: [
          {
            id: 'test-series-3',
            title: 'Test Manga 3',
            author: 'Test Author 3',
            coverImageUrl: 'test-cover-3.jpg',
            synopsis: 'Test synopsis 3',
            genres: ['Fantasy', 'Magic'],
            status: 'ongoing',
            rating: 4.8,
            sourceUrl: 'test-url-3'
          }
        ]
      })
    }))
  };
});

// Mock the useModeManager hook
jest.mock('./hooks/useModeManager', () => ({
  useModeManager: () => ({
    currentMode: 'navigation',
    context: {
      mode: 'navigation',
      navigationContext: {
        currentRoute: '/',
        scrollPosition: 0
      },
      timestamp: new Date()
    },
    preferences: {
      readingMode: 'single-page',
      zoomLevel: 1.0,
      autoPreload: true,
      downloadQuality: 'high',
      notificationsEnabled: true
    },
    isTransitioning: false,
    switchToNavigation: jest.fn(),
    switchToReading: jest.fn(),
    resumeReading: jest.fn(),
    updateNavigationContext: jest.fn(),
    updateReadingContext: jest.fn(),
    updatePreferences: jest.fn()
  })
}));

describe('App Component', () => {
  test('renders MangaTech title in navigation bar', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MangaTech/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(titleElements[0]).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<App />);
    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.getByText('LIBRARY')).toBeInTheDocument();
    expect(screen.getByText('SEARCH')).toBeInTheDocument();
  });

  test('renders homepage content after loading', async () => {
    render(<App />);
    
    // Initially should show loading state
    expect(screen.getByText('🔄 Connecting to ManhwaZ neural network...')).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Welcome to the digital realm of manhwa. Browse trending content and discover new dimensions.')).toBeInTheDocument();
    });
    
    expect(screen.getByText('🔥 Trending Archives')).toBeInTheDocument();
  });

  test('displays main brand', () => {
    render(<App />);
    expect(screen.getByText('⚡ MANGATECH')).toBeInTheDocument();
  });
});