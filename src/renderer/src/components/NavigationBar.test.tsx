import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NavigationBar from './NavigationBar';

// Mock the useModeManager hook
jest.mock('../hooks/useModeManager', () => ({
  useModeManager: () => ({
    resumeReading: jest.fn(),
    context: {
      readingContext: null,
      previousMode: null
    },
    preferences: {
      readingMode: 'single-page',
      zoomLevel: 1.0,
      autoPreload: true,
      downloadQuality: 'high',
      notificationsEnabled: true
    }
  })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NavigationBar Component', () => {
  const mockOnEnterReading = jest.fn();

  beforeEach(() => {
    mockOnEnterReading.mockClear();
  });

  test('renders brand title', () => {
    renderWithRouter(
      <NavigationBar onEnterReading={mockOnEnterReading} />
    );
    expect(screen.getByText('MangaTech')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    renderWithRouter(
      <NavigationBar onEnterReading={mockOnEnterReading} />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  test('displays preferences indicator when preferences are loaded', () => {
    renderWithRouter(
      <NavigationBar onEnterReading={mockOnEnterReading} />
    );
    expect(screen.getByTitle('User preferences loaded')).toBeInTheDocument();
    expect(screen.getByText('📄')).toBeInTheDocument(); // Single-page mode indicator
  });

  test('does not show resume reading button when no reading context', () => {
    renderWithRouter(
      <NavigationBar onEnterReading={mockOnEnterReading} />
    );
    expect(screen.queryByText('📖 Resume Reading')).not.toBeInTheDocument();
  });
});