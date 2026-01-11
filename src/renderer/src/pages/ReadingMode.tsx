import React, { useState, useEffect, useCallback } from 'react';
import { OnlineReader } from '../components';
import { useReadingState } from '../hooks/useReadingState';
import './ReadingMode.css';

interface ReadingModeProps {
  onExitReading: () => void;
  chapterId?: string;
  seriesId?: string;
  initialPage?: number;
}

const ReadingMode: React.FC<ReadingModeProps> = ({ 
  onExitReading, 
  chapterId,
  seriesId,
  initialPage = 1 
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const {
    currentState,
    isLoading: stateLoading,
    error: stateError,
    startSession,
    endSession,
    updatePage,
    updateZoom,
    getLastReadingPosition
  } = useReadingState();

  // Initialize reading session when component mounts with chapter
  useEffect(() => {
    const initializeSession = async () => {
      if (chapterId && seriesId) {
        // Try to restore last reading position
        const lastPosition = await getLastReadingPosition(seriesId, chapterId);
        const startPage = lastPosition?.pageNumber || initialPage;
        
        const state = await startSession(seriesId, chapterId, startPage);
        if (state) {
          setCurrentPage(state.pageNumber);
          setZoomLevel(state.zoomLevel);
        }
      }
    };

    initializeSession();
  }, [chapterId, seriesId, initialPage, startSession, getLastReadingPosition]);

  // Cleanup session on unmount or when exiting
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    updatePage(pageNumber);
  }, [updatePage]);

  const handleZoomChange = useCallback((newZoomLevel: number) => {
    setZoomLevel(newZoomLevel);
    updateZoom(newZoomLevel);
  }, [updateZoom]);

  const handleExitReading = useCallback(async () => {
    await endSession();
    onExitReading();
  }, [endSession, onExitReading]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Show loading state while initializing reading session
  if (stateLoading) {
    return (
      <div className="reading-mode loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing reading session...</p>
        </div>
      </div>
    );
  }

  // Show error state if reading state failed to initialize
  if (stateError) {
    return (
      <div className="reading-mode error">
        <div className="error-message">
          <h3>Failed to Initialize Reading Session</h3>
          <p>{stateError}</p>
          <button onClick={handleExitReading} className="exit-button">
            Back to Navigation
          </button>
        </div>
      </div>
    );
  }

  // If we have a chapter ID, show the enhanced online reader
  if (chapterId && seriesId) {
    return (
      <div className={`reading-mode ${isFullscreen ? 'fullscreen' : ''}`}>
        <OnlineReader
          chapterId={chapterId}
          onClose={handleExitReading}
          onPageChange={handlePageChange}
          onZoomChange={handleZoomChange}
          initialPage={currentPage}
          initialZoom={zoomLevel}
        />
        
        {/* Enhanced reading controls */}
        <div className="enhanced-reading-controls">
          <button 
            className="fullscreen-toggle"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)"}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          
          {currentState && (
            <div className="reading-state-info">
              <span>Page {currentState.pageNumber}</span>
              <span>Zoom {Math.round(currentState.zoomLevel * 100)}%</span>
              <span className="auto-save-indicator">
                ● Auto-saving
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Otherwise show the enhanced placeholder interface
  return (
    <div className="reading-mode">
      <div className="reading-controls">
        <button 
          className="exit-reading-button"
          onClick={handleExitReading}
          title="Exit reading mode"
        >
          ← Back to Navigation
        </button>
      </div>
      
      <div className="reading-content">
        <div className="reading-placeholder">
          <h3>Reading Mode</h3>
          <p>Select a chapter to start reading with enhanced features:</p>
          <div className="feature-grid">
            <div className="feature-item">
              <h4>📖 Immersive Reading</h4>
              <p>Full-screen interface with minimal UI elements for distraction-free reading</p>
            </div>
            <div className="feature-item">
              <h4>🔄 State Persistence</h4>
              <p>Automatically saves your reading position, zoom level, and preferences</p>
            </div>
            <div className="feature-item">
              <h4>🎮 Smart Navigation</h4>
              <p>Keyboard shortcuts, mouse controls, and touch gestures for easy page turning</p>
            </div>
            <div className="feature-item">
              <h4>🔍 Zoom Controls</h4>
              <p>Flexible zoom functionality for detailed viewing of manga pages</p>
            </div>
            <div className="feature-item">
              <h4>🌐 Online Streaming</h4>
              <p>Stream chapters directly with intelligent preloading and caching</p>
            </div>
            <div className="feature-item">
              <h4>📱 Responsive Design</h4>
              <p>Optimized for different screen sizes and reading preferences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingMode;