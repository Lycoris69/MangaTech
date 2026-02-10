# MangaTech

A desktop application for searching, downloading, and reading manga, manhua, and webtoon content.
> [!IMPORTANT]
> This application is for personal use only. All rights belong to their respective owners.

## Features

- 🔍 Search and discover manga from multiple sources
- 📥 Download manga for offline reading (Batch downloads supported)
- 📖 Full-screen reading mode with zoom functionality and chapter selector
- 📚 Personal library management with favorites
- 📊 Real-time Download Manager with progress tracking
- 🔄 Dual interface modes (Navigation and Reading)
- 🎯 Trending content discovery
- ⬆️ Return-to-top button for easy navigation during infinite scroll
- 🚀 Executable releases for Linux, Windows, and Mac

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Install dependencies:
```bash
make install
```

2. Start development server:
```bash
make dev
```

This will start both the Electron main process and the React renderer in development mode.

### Make Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start development server |
| `make build` | Build the application |
| `make test` | Run tests |
| `make test-watch` | Run tests in watch mode |
| `make lint` | Run ESLint |
| `make lint-fix` | Run ESLint with auto-fix |
| `make format` | Format code with Prettier |
| `make clean` | Clean build artifacts |
| `make dist` | Build and create release (host platform) |
| `make dist-win` | Build and create release for Windows |
| `make dist-linux` | Build and create release for Linux |
| `make dist-all` | Build and create release for both Win/Linux |
| `make pack` | Create electron package |

Run `make help` to see all available commands.

### Available npm Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run pack` - Package without building (requires prior build)
- `npm run dist` - Build and create distributable executables

### Building for Release

To create distributable executables:

```bash
make dist          # Build for current platform
make dist-win      # Build for Windows
make dist-linux    # Build for Linux
make dist-all      # Build for both Windows and Linux
```

This will build the application and package it using electron-builder. The output will be in the `release/` directory:

- **Linux**: AppImage executable
- **Windows**: NSIS installer
- **Mac**: DMG installer

#### Build Configuration

The build is configured in `package.json` under the `build` key:
- **App ID**: `com.mangatech.app`
- **Product Name**: MangaTech
- **Special handling**: Sharp and @img packages are unpacked from asar for proper functionality

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main application entry
│   └── preload.ts  # Preload script for security
└── renderer/       # React renderer process
    └── src/
        ├── App.tsx     # Main React component
        ├── main.tsx    # React entry point
        └── ...
```

## Technology Stack

- **Electron** - Desktop application framework
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality tools

## License

MIT