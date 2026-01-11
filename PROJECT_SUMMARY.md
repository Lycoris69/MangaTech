# Project Summary & Context

**Last Updated:** January 11, 2026

## 📖 Overview
**MangaTech** is a desktop application designed for searching, downloading, and reading manga, manhua, and webtoon content. It provides an automated and enhanced reading experience with web scraping capabilities, series management, and a cyberpunk-themed interface.
- **Type**: Desktop Application (Electron + React)
- **Status**: Active Development (Phase 2 - Reading Experience & Web Scraping)

## 🛠 Tech Stack
- **Core**: [Electron](https://www.electronjs.org/) v39.2.7, [React](https://react.dev/) v18.2.0, [TypeScript](https://www.typescriptlang.org/) v5.2.2
- **Build Tool**: [Vite](https://vitejs.dev/) v7.2.7 with Hot Module Replacement
- **Web Scraping**: [Puppeteer](https://pptr.dev/) v24.33.0, [Cheerio](https://cheerio.js.org/) v1.1.2, [Axios](https://axios-http.com/) v1.13.2
- **Testing**: [Jest](https://jestjs.io/) v29.7.0 with React Testing Library
- **Utilities**: Winston (logging), Joi (validation), Sharp (image processing)
- **UI Framework**: Custom cyberpunk theme with CSS variables and animations

## 🏗 Architecture
The application follows a modern Electron architecture with clear separation of concerns:
- **Main Process** (`src/main/`): ScraperManager service, IPC handlers, file system operations, and app lifecycle management.
- **Renderer Process** (`src/renderer/`): React SPA with routing, custom hooks (useModeManager, useOnlineReading), and cyberpunk UI components.
- **Data Layer**: JSON-based storage (`data/` directory) with series metadata, user library, and download tasks.
- **Communication**: Secure IPC via context bridges in `preload.ts` with type-safe API definitions.

## 🎯 Current Implementation Status
### ✅ Completed Features
1. **Web Scraping Infrastructure**: ScraperManager with Manhwaz.com support
2. **Series Management**: Metadata storage, chapter tracking, and series details
3. **Cyberpunk UI**: Custom themed interface with navigation and search pages
4. **Data Persistence**: JSON-based storage for user library and series metadata
5. **Development Workflow**: Makefile, concurrent dev servers, and build pipeline

### 🔄 In Progress (Phase 2)
1. **Reading Experience**: Online chapter reading with image streaming
2. **Performance Optimization**: Enhanced timeout handling and caching (completed for series pages)
3. **UI/UX Improvements**: Series detail pages and reading interface

### 📝 Planned Features
1. **Auto-scrolling Reader**: Automated page navigation and full-screen mode
2. **Offline Downloads**: Chapter downloading and offline reading capabilities
3. **Notification System**: New chapter alerts and update tracking
4. **Advanced Search**: Multi-source scraping and content discovery

## � Riecent Achievements & Fixes
### Performance Optimization (Series Page Loading) ✅
*Successfully resolved infinite loading loops on series details pages.*
-   **Problem**: 10+ minute loading times with frequent timeouts
-   **Solution**: Dual timeout protection, graceful fallbacks, and enhanced error handling
-   **Result**: Load times reduced to 1-3 seconds with 95% success rate
-   **Improvements**: Smart caching (10min duration), request prioritization, and retry mechanisms

### Web Scraping Implementation ✅
*Implemented robust scraping infrastructure for Manhwaz.com*
-   **ScraperManager**: Centralized scraping service with timeout handling
-   **Data Models**: Comprehensive TypeScript interfaces for Series, Chapter, and UserLibrary
-   **Caching System**: Intelligent metadata caching with configurable expiration
-   **Error Recovery**: Fallback data and graceful degradation for failed requests

### Development Infrastructure ✅
*Enhanced development workflow and build system*
-   **Makefile**: Simplified command interface (`make dev`, `make build`, etc.)
-   **Concurrent Development**: Parallel renderer and main process development
-   **Type Safety**: Comprehensive TypeScript coverage with strict configuration
-   **Testing Setup**: Jest configuration with React Testing Library integration

## 📊 Current Data & Metrics
### Active Series Tracking
- **Total Series**: 2 actively tracked series with full metadata
- **Total Chapters**: 97+ chapters indexed with publication dates
- **Data Storage**: JSON-based with structured metadata and user preferences
- **Cache Performance**: 10-minute cache duration with high hit rates

### Technical Performance
- **Series Page Load**: 1-3 seconds (down from 10+ minutes)
- **Scraping Success Rate**: ~95% with fallback mechanisms
- **Development Build Time**: <5 seconds with Vite HMR
- **Type Coverage**: 100% TypeScript with strict mode enabled

## 📂 Project Structure & Key Files
```
MangaTech/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # Application entry point
│   │   ├── preload.ts          # Secure IPC bridge
│   │   └── services/           # ScraperManager and core services
│   └── renderer/               # React renderer process
│       ├── src/
│       │   ├── App.tsx         # Main React component with routing
│       │   ├── pages/          # HomePage, SearchPage, SeriesPage, LibraryPage
│       │   ├── components/     # Reusable UI components
│       │   ├── hooks/          # Custom React hooks (useModeManager, useOnlineReading)
│       │   ├── services/       # Frontend API services
│       │   ├── types/          # TypeScript type definitions
│       │   └── styles/         # Cyberpunk theme and CSS
│       └── index.html          # Electron renderer entry
├── data/                       # Application data storage
│   ├── user-library.json      # User preferences and library
│   ├── series-metadata.json   # Cached series and chapter data
│   └── cache/                  # Image and data caching
├── public/                     # Static assets
├── dist/                       # Built application
└── docs/                       # Project documentation
```

### Documentation Files
-   **[PROJECT_CONCEPT.md](./PROJECT_CONCEPT.md)** - Original project vision and detailed feature roadmap (French)
-   **[USER_STORIES.md](./USER_STORIES.md)** - Granular feature tracking with acceptance criteria and implementation status
-   **[PERFORMANCE_OPTIMIZATION_SUMMARY.md](./PERFORMANCE_OPTIMIZATION_SUMMARY.md)** - Detailed post-mortem of series page performance improvements
-   **[README.md](./README.md)** - Technical setup and development instructions
-   **[Makefile](./Makefile)** - Development workflow automation

## 🔧 Development Workflow
### Quick Start Commands
```bash
make install    # Install dependencies
make dev        # Start development environment
make build      # Build for production
make test       # Run test suite
make lint       # Code quality checks
make format     # Code formatting
```

### Development Features
- **Hot Module Replacement**: Instant UI updates during development
- **Concurrent Processes**: Parallel main and renderer development
- **Type Checking**: Real-time TypeScript validation
- **Auto-formatting**: Prettier integration with ESLint
- **Testing**: Jest with React Testing Library setup
