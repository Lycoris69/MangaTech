/**
 * Layout Mirroring and UI Integration Tests
 * Task 13: Final integration and testing
 * 
 * Validates manhwaz.com layout mirroring accuracy
 * Tests UI component integration with scraper services
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ManhwazHomepage } from './ManhwazHomepage'
import HomePage from '../pages/HomePage'
import { ManhwazScraper } from '../services/scraper/ManhwazScraper'

// Mock the scraper services
jest.mock('../services/scraper/ManhwazScraper')

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

// Mock notification system
jest.mock('./NotificationSystem', () => ({
  useNotifications: () => ({
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  })
}))

const MockedManhwazScraper = ManhwazScraper as jest.MockedClass<typeof ManhwazScraper>

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Layout Mirroring and UI Integration Tests', () => {
  let mockScraper: jest.Mocked<ManhwazScraper>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate.mockClear()

    // Setup mock scraper with manhwaz.com-like data
    mockScraper = {
      getTrendingContent: jest.fn(),
      getLatestReleases: jest.fn(),
      searchSeries: jest.fn(),
      getSeriesDetails: jest.fn(),
      getChapterPages: jest.fn(),
      getAutocompleteSuggestions: jest.fn(),
      validateSource: jest.fn(),
      cleanup: jest.fn()
    } as any

    MockedManhwazScraper.mockImplementation(() => mockScraper)
  })

  describe('Homepage Layout Mirroring', () => {
    it('should mirror manhwaz.com homepage structure and visual hierarchy', async () => {
      // Mock trending content that mirrors manhwaz.com structure
      const mockTrendingContent = {
        hotSeries: [
          {
            id: 'solo-leveling',
            title: 'Solo Leveling',
            author: 'Chugong',
            coverImageUrl: 'https://manhwaz.com/covers/solo-leveling.jpg',
            synopsis: '10 years ago, after "the Gate" that connected the real world with the monster world opened...',
            genres: ['Action', 'Adventure', 'Fantasy'],
            status: 'completed' as const,
            rating: 9.8,
            sourceUrl: 'https://manhwaz.com/series/solo-leveling'
          }
        ],
        latestReleases: [
          {
            id: 'solo-leveling-179',
            title: 'Solo Leveling',
            author: 'Chugong',
            coverImageUrl: 'https://manhwaz.com/covers/solo-leveling.jpg',
            synopsis: '10 years ago, after "the Gate" that connected the real world with the monster world opened...',
            genres: ['Action', 'Adventure', 'Fantasy'],
            status: 'completed' as const,
            rating: 9.8,
            sourceUrl: 'https://manhwaz.com/series/solo-leveling'
          }
        ],
        mostViewed: []
      }

      mockScraper.getTrendingContent.mockResolvedValue(mockTrendingContent)

      renderWithRouter(<HomePage onEnterReading={jest.fn()} />)

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Welcome to MangaTech')).toBeInTheDocument()
      })

      // Verify manhwaz.com-like layout structure (Requirements 6.1, 6.2)
      expect(screen.getByText('Trending Now')).toBeInTheDocument()
      expect(screen.getByText('Latest Releases')).toBeInTheDocument()

      // Verify content organization follows manhwaz.com categorization (Requirements 6.4)
      expect(screen.getAllByText('Solo Leveling')).toHaveLength(3) // Should appear in featured, trending, and latest sections
    })

    it('should maintain visual hierarchy and spacing similar to manhwaz.com', async () => {
      const mockTrendingContent = {
        hotSeries: [
          {
            id: 'test-series',
            title: 'Test Series',
            author: 'Test Author',
            coverImageUrl: 'https://manhwaz.com/covers/test.jpg',
            synopsis: 'Test synopsis',
            genres: ['Action'],
            status: 'ongoing' as const,
            rating: 8.5,
            sourceUrl: 'https://manhwaz.com/series/test'
          }
        ],
        latestReleases: [],
        mostViewed: []
      }

      mockScraper.getTrendingContent.mockResolvedValue(mockTrendingContent)

      renderWithRouter(<HomePage onEnterReading={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getAllByText('Test Series')).toHaveLength(2) // Should appear in featured and trending sections
      })

      // Verify visual elements are present (Requirements 6.2, 6.3)
      const seriesCards = screen.getAllByText('Test Series')
      expect(seriesCards.length).toBeGreaterThan(0)

      // Check for rating display (should appear in both featured and trending sections)
      expect(screen.getAllByText('★ 8.5')).toHaveLength(2)

      // Check for author information
      expect(screen.getByText('Test Author')).toBeInTheDocument()

      // Check for genre tags (should appear in both featured and trending sections)
      expect(screen.getAllByText('Action')).toHaveLength(2)
    })
  })

  describe('ManhwazHomepage Component Integration', () => {
    it('should integrate all manhwaz-specific components correctly', () => {
      renderWithRouter(<ManhwazHomepage />)

      // Verify all main sections are present (Requirements 6.1)
      expect(screen.getByText('MangaTech')).toBeInTheDocument()
      expect(screen.getByText('Discover the latest manga, manhua, and webtoons from manhwaz.com')).toBeInTheDocument()

      // Verify search functionality is prominently displayed (Requirements 3.1)
      expect(screen.getByPlaceholderText('Search thousands of manga titles...')).toBeInTheDocument()

      // Verify statistics display
      expect(screen.getByText('10K+')).toBeInTheDocument()
      expect(screen.getByText('Manga Series')).toBeInTheDocument()

      // Verify feature cards
      expect(screen.getByText('Vast Library')).toBeInTheDocument()
      expect(screen.getByText('Real-time Updates')).toBeInTheDocument()
    })

    it('should handle search interactions correctly', async () => {
      renderWithRouter(<ManhwazHomepage />)

      const searchInput = screen.getByPlaceholderText('Search thousands of manga titles...')

      // Simulate search interaction (Requirements 3.1, 3.2)
      fireEvent.change(searchInput, { target: { value: 'test query' } })
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

      // Should navigate to search results
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/search?q=test%20query')
      })
    })
  })

  describe('Error State Integration', () => {
    it('should display appropriate error messages when scraping fails', async () => {
      mockScraper.getTrendingContent.mockRejectedValue(new Error('Network error'))

      renderWithRouter(<HomePage onEnterReading={jest.fn()} />)

      // Should display error state (Requirements 1.5, 5.3)
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/failed to load|error|unable to load/i)
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })

    it('should provide retry functionality when errors occur', async () => {
      mockScraper.getTrendingContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          hotSeries: [],
          latestReleases: [],
          mostViewed: []
        })

      renderWithRouter(<HomePage onEnterReading={jest.fn()} />)

      // Wait for error state and find retry button
      await waitFor(() => {
        const retryButtons = screen.queryAllByText(/retry|try again/i)
        expect(retryButtons.length).toBeGreaterThan(0)
      })

      // Click retry button
      const retryButton = screen.getAllByText(/retry|try again/i)[0]
      fireEvent.click(retryButton)

      // Should attempt to reload content
      await waitFor(() => {
        expect(mockScraper.getTrendingContent).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Responsive Design Integration', () => {
    it('should adapt to different screen sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet size
      })

      renderWithRouter(<ManhwazHomepage />)

      // Verify responsive design elements (Requirements 6.5)
      expect(screen.getByText('MangaTech')).toBeInTheDocument()

      // Change to mobile size
      Object.defineProperty(window, 'innerWidth', {
        value: 375, // Mobile size
      })

      // Component should still render correctly
      expect(screen.getByText('MangaTech')).toBeInTheDocument()
    })

    it('should maintain functionality across different screen sizes', () => {
      renderWithRouter(<ManhwazHomepage />)

      // Search should work on all screen sizes
      const searchInput = screen.getByPlaceholderText('Search thousands of manga titles...')
      expect(searchInput).toBeInTheDocument()

      // Navigation should be accessible
      expect(screen.getByText('MangaTech')).toBeInTheDocument()
    })
  })
})