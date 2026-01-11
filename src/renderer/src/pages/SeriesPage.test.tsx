import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import SeriesPage from './SeriesPage';
import { jest } from '@jest/globals';

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-manga-app')
  }
}));

// Mock the services with proper implementations
jest.mock('../services/StorageService', () => ({
  StorageService: jest.fn().mockImplementation(() => ({
    getSeriesById: jest.fn(),
    loadUserLibrary: jest.fn(),
    upsertSeries: jest.fn(),
    saveUserLibrary: jest.fn()
  }))
}));

jest.mock('../services/ScraperManager', () => ({
  ScraperManager: jest.fn().mockImplementation(() => ({
    getSeriesDetails: jest.fn()
  }))
}));

jest.mock('../services/LibraryService', () => ({
  LibraryService: jest.fn().mockImplementation(() => ({
    toggleFavorite: jest.fn()
  }))
}));

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/series/test-series-1']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('SeriesPage Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    const mockOnEnterReading = jest.fn();
    renderWithRouter(<SeriesPage onEnterReading={mockOnEnterReading} />);
    
    expect(screen.getByText('Loading series details...')).toBeInTheDocument();
  });

  test('renders component without crashing', () => {
    const mockOnEnterReading = jest.fn();
    renderWithRouter(<SeriesPage onEnterReading={mockOnEnterReading} />);
    
    // Check that the component renders the basic structure
    expect(screen.getByText('Loading series details...')).toBeInTheDocument();
    
    // Check that the series page container is present
    const seriesPageContainer = document.querySelector('.series-page');
    expect(seriesPageContainer).toBeInTheDocument();
  });
});