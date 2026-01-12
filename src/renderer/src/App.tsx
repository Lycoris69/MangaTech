import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SeriesPage from './pages/SeriesPage';
import LibraryPage from './pages/LibraryPage';
import DownloadsPage from './pages/DownloadsPage';
import './App.css';

// Force CSS variables to be available
const forceTheme = () => {
  const root = document.documentElement;
  root.style.setProperty('--cyber-bg-primary', '#0a0a0f');
  root.style.setProperty('--cyber-bg-secondary', '#1a1a2e');
  root.style.setProperty('--cyber-bg-tertiary', '#16213e');
  root.style.setProperty('--cyber-purple', '#9d4edd');
  root.style.setProperty('--cyber-purple-bright', '#c77dff');
  root.style.setProperty('--cyber-cyan', '#00f5ff');
  root.style.setProperty('--cyber-text-primary', '#e0e1dd');
  root.style.setProperty('--cyber-text-secondary', '#a8a8a8');
  root.style.setProperty('--cyber-border', '#3c096c');

  // Force body background
  document.body.style.background = 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)';
  document.body.style.color = '#e0e1dd';
  document.body.style.fontFamily = "'Rajdhani', sans-serif";
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.minHeight = '100vh';
};

const ReadingMode = () => (
  <div className="cyber-reading-mode">
    <h1 className="cyber-page-header cyber-flicker">📖 NEURAL READING MODE</h1>
    <p>Reading functionality is being integrated...</p>
    <Link to="/" className="cyber-back-link">
      ← EXIT NEURAL LINK
    </Link>
  </div>
);

// Cyberpunk Navigation Component
const Navigation = () => (
  <nav className="cyber-nav" style={{ padding: '15px 30px', display: 'flex', alignItems: 'center' }}>
    <div className="cyber-brand">
      ⚡ MANGATECH
    </div>
    <div className="cyber-nav-links" style={{ marginLeft: 'auto' }}>
      <Link to="/" className="cyber-nav-link">
        HOME
      </Link>
      <Link to="/search" className="cyber-nav-link">
        SEARCH
      </Link>
      <Link to="/library" className="cyber-nav-link">
        LIBRARY
      </Link>
      <Link to="/downloads" className="cyber-nav-link">
        DOWNLOADS
      </Link>
    </div>
  </nav>
);

// Controller component to handle swipe navigation within Router context
const SwipeController = ({ children }: { children: React.ReactNode }) => {
  useSwipeNavigation({
    threshold: 100, // Distance to swipe
    edgeOnly: false // Allow swipe from anywhere (as requested "as a whole")
  });
  return <>{children}</>;
};

function App() {
  // Force theme on component mount
  useEffect(() => {
    forceTheme();
  }, []);

  return (
    <Router>
      <SwipeController>
        <div
          className="App"
          style={{
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%) !important',
            color: '#e0e1dd !important',
            minHeight: '100vh',
            fontFamily: "'Rajdhani', sans-serif",
            position: 'relative'
          }}
        >
          <Navigation />
          <main
            className="main-content"
            style={{
              background: 'transparent',
              color: '#e0e1dd',
              flex: 1
            }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/series/:seriesId" element={<SeriesPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/read/:seriesId/:chapterId" element={<ReadingMode />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </SwipeController>
    </Router>
  );
}

export default App;