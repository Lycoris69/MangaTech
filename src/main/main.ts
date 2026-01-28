// @ts-ignore
import * as electron from 'electron';
const { app, BrowserWindow, ipcMain, session, dialog, protocol, net } = require('electron');
import * as path from 'path';
import * as fs from 'fs/promises';
import { ScraperManager } from './services/ScraperManager';
import { DownloadManager } from './services/DownloadManager';
import { IpcManager } from './services/IpcManager';

// Disable hardware acceleration to prevent GPU errors on Linux/Wayland
// This must be called before the app is ready.
app.disableHardwareAcceleration();

// Ozone platform hints for better Linux/Wayland support
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

class MangaTechApp {
  private mainWindow: electron.BrowserWindow | null = null;
  private scraperManager: ScraperManager;
  private downloadManager: DownloadManager;
  private readonly dataDir: string;
  private readonly logDir: string;

  constructor() {
    // Use user data directory for production or local data directory for development
    this.dataDir = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'data')
      : path.join(app.getPath('userData'), 'data');

    this.logDir = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'logs')
      : app.getPath('logs');

    this.scraperManager = new ScraperManager(undefined, this.logDir);

    this.downloadManager = new DownloadManager(
      this.scraperManager,
      path.join(this.dataDir, 'download-tasks.json'),
      this.logDir
    );

    this.initializeApp();
  }

  private initializeApp(): void {
    // Ensure data directory exists
    this.ensureDataDir();

    console.log('Electron app object type:', typeof app);
    if (!app) {
      console.error('CRITICAL: Electron app object is undefined!');
    }

    // Handle app ready event
    app.whenReady().then(() => {
      this.registerLocalProtocol();
      this.setupWebRequestInterceptors();
      this.createMainWindow();

      if (this.mainWindow) {
        this.downloadManager.setWebContents(this.mainWindow.webContents);
      }

      app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Handle window closed events
    app.on('window-all-closed', () => {
      // On macOS, keep app running even when all windows are closed
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_: electron.Event, contents: electron.WebContents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });

    // Cleanup services on exit
    app.on('before-quit', async () => {
      await this.scraperManager.cleanup();
    });

    this.setupIpcHandlers();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      show: true, // Show immediately on Linux to avoid ready-to-show delays
    });

    console.log('MainWindow created');

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading development URL: http://localhost:3000');
      this.mainWindow?.loadURL('http://localhost:3000').catch(err => {
        console.error('Failed to load URL:', err);
      });
    } else {
      this.mainWindow?.loadFile(path.join(__dirname, 'renderer/index.html')).catch(err => {
        console.error('Failed to load file:', err);
      });
    }

    // Show window when ready (as a backup if not already shown)
    this.mainWindow?.once('ready-to-show', () => {
      console.log('MainWindow ready-to-show');
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow?.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private registerLocalProtocol(): void {
    protocol.handle('manga-local', (request: Request) => {
      const url = request.url.replace('manga-local:///', '');
      return net.fetch('file:///' + decodeURIComponent(url));
    });
  }

  private setupWebRequestInterceptors(): void {
    // Intercept requests to manhwaz.com and its CDN to add Referer and Origin headers
    // This bypasses hotlink protection (Requirement 5.4)
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.manhwaz.com/*', '*://manhwaz.com/*'] },
      (details: electron.OnBeforeSendHeadersListenerDetails, callback: (beforeSendResponse: electron.BeforeSendResponse) => void) => {
        const headers = { ...details.requestHeaders };

        // Add Referer if not present or incorrect
        if (!headers['Referer'] || !headers['Referer'].includes('manhwaz.com')) {
          headers['Referer'] = 'https://manhwaz.com/';
        }

        // Add Origin for CORS compliance
        if (!headers['Origin']) {
          headers['Origin'] = 'https://manhwaz.com';
        }

        // Use a consistent User-Agent
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        callback({ cancel: false, requestHeaders: headers });
      }
    );

    // Also handle CSP if necessary (though usually Electron permits file:// to https://)
    // For development (http://localhost:3000), we might need to allow images
    session.defaultSession.webRequest.onHeadersReceived(
      { urls: ['*://*.manhwaz.com/*'] },
      (details: electron.OnHeadersReceivedListenerDetails, callback: (headersReceivedResponse: electron.HeadersReceivedResponse) => void) => {
        const headers = { ...details.responseHeaders };

        // Ensure Access-Control-Allow-Origin is set to allow the renderer to read images if needed
        headers['Access-Control-Allow-Origin'] = ['*'];

        callback({ cancel: false, responseHeaders: headers });
      }
    );
  }

  private setupIpcHandlers(): void {
    // Example IPC handler for future use
    // --- Storage Handlers ---
    IpcManager.handle('storage:read', async (_, filename: string) => {
      try {
        const filePath = path.join(this.dataDir, filename);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        // Return null if file doesn't exist
        return null;
      }
    });

    IpcManager.handle('storage:write', async (_, filename: string, data: any) => {
      try {
        const filePath = path.join(this.dataDir, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
      } catch (error) {
        console.error(`Failed to write to ${filename}:`, error);
        throw error;
      }
    });

    // --- Scraper Handlers ---

    // Get trending content (Hot Series, Latest Releases, Most Viewed)
    IpcManager.handle('scraper:getTrendingContent', async () => {
      try {
        return await this.scraperManager.getTrendingContent();
      } catch (error) {
        console.error('Failed to get trending content:', error);
        throw error;
      }
    });

    // Get latest releases only (paged)
    IpcManager.handle('scraper:getLatestReleases', async (_, page: number = 1) => {
      try {
        return await this.scraperManager.getLatestReleases(page);
      } catch (error) {
        console.error(`Failed to get latest releases for page ${page}:`, error);
        throw error;
      }
    });

    // Get hot scans only
    IpcManager.handle('scraper:getHotScans', async () => {
      try {
        const trending = await this.scraperManager.getTrendingContent();
        return trending.hotSeries;
      } catch (error) {
        console.error('Failed to get hot scans:', error);
        throw error;
      }
    });

    // Search for series
    IpcManager.handle('scraper:searchSeries', async (_, query: string) => {
      try {
        return await this.scraperManager.searchSeries(query);
      } catch (error) {
        console.error(`Failed to search for "${query}":`, error);
        throw error;
      }
    });

    // Get series details
    IpcManager.handle('scraper:getSeriesDetails', async (_, seriesUrl: string) => {
      try {
        // ScraperManager handles both IDs and full URLs
        return await this.scraperManager.getSeriesDetails(seriesUrl);
      } catch (error) {
        console.error(`Failed to get series details for "${seriesUrl}":`, error);
        throw error;
      }
    });

    // Get chapter pages
    IpcManager.handle('scraper:getChapterPages', async (_, chapterUrl: string, seriesId?: string) => {
      try {
        // 1. Attempt to load from DownloadManager tasks first
        const localPages = await this.downloadManager.getLocalChapterPages(chapterUrl);
        if (localPages && localPages.length > 0) {
          return localPages;
        }

        // 2. Fallback: If seriesId is provided, try to resolve via user-library.json (for imported series)
        if (seriesId) {
          try {
            const libraryPath = path.join(this.dataDir, 'user-library.json');
            const libraryData = JSON.parse(await fs.readFile(libraryPath, 'utf-8'));
            const download = libraryData.downloads?.find((d: any) => d.seriesId === seriesId);

            if (download && download.downloadPath) {
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
              const chapterTarget = normalize(path.basename(chapterUrl));

              // Try direct match first
              let chapterPath = path.join(download.downloadPath, path.basename(chapterUrl));

              if (!(await fs.access(chapterPath).then(() => true).catch(() => false))) {
                // Fuzzy match: Look for a folder that matches the normalized name
                const subDirs = await fs.readdir(download.downloadPath, { withFileTypes: true });
                const matchedDir = subDirs.find(d => d.isDirectory() && normalize(d.name) === chapterTarget);

                if (matchedDir) {
                  chapterPath = path.join(download.downloadPath, matchedDir.name);
                } else {
                  // Final attempt: Check if the chapterUrl itself is a subfolder
                  const altPath = path.join(download.downloadPath, chapterUrl.replace(/^\/+/, ''));
                  if (await fs.access(altPath).then(() => true).catch(() => false)) {
                    chapterPath = altPath;
                  }
                }
              }

              if (await fs.access(chapterPath).then(() => true).catch(() => false)) {
                const files = await fs.readdir(chapterPath);
                const imageFiles = files
                  .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
                  .sort();

                if (imageFiles.length > 0) {
                  return imageFiles.map((file, index) => ({
                    pageNumber: index + 1,
                    imageUrl: `manga-local:///${path.join(chapterPath, file)}`,
                    localPath: path.join(chapterPath, file)
                  }));
                }
              }
            }
          } catch (fallbackError) {
          }
        }

        // 3. Final Fallback to online scraper
        return await this.scraperManager.getChapterPages(chapterUrl);
      } catch (error) {
        throw error;
      }
    });

    // --- Download Handlers ---

    IpcManager.handle('dialog:selectDirectory', async () => {
      try {
        // On some Linux systems, passing the parent window can cause GLib/Gtk signal issues (e.g. no handler error).
        // Calling it without a parent can be more stable in those environments.
        const result = await dialog.showOpenDialog({
          title: 'Select Download Directory',
          properties: ['openDirectory', 'createDirectory'],
          buttonLabel: 'Select Folder'
        });

        if (result.canceled) return null;
        return result.filePaths[0];
      } catch (error) {
        return null;
      }
    });

    IpcManager.handle('scraper:downloadChapter', async (_, { seriesId, chapterId, seriesTitle, chapterTitle, basePath }) => {
      try {
        const result = await this.downloadManager.downloadChapter(
          seriesId,
          chapterId,
          seriesTitle,
          chapterTitle,
          basePath
        );
        return result;
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:getDownloadTasks', async () => {
      try {
        return await this.downloadManager.getTasks();
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:pauseDownload', async (_, taskId: string) => {
      try {
        return await this.downloadManager.pauseDownload(taskId);
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:resumeDownload', async (_, taskId: string) => {
      try {
        return await this.downloadManager.resumeDownload(taskId);
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:cancelDownload', async (_, taskId: string) => {
      try {
        return await this.downloadManager.cancelDownload(taskId);
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:retryDownload', async (_, taskId: string) => {
      try {
        return await this.downloadManager.retryDownload(taskId);
      } catch (error) {
        throw error;
      }
    });

    IpcManager.handle('scraper:scanLocalDownloads', async (_, basePath: string) => {
      try {
        const results: any[] = [];
        const entries = await fs.readdir(basePath, { withFileTypes: true });

        const isChapterLike = async (dirPath: string) => {
          try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            return files.some(f => f.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(f.name));
          } catch { return false; }
        };

        // Check if base folder itself is a series
        const baseChapters: any[] = [];
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const p = path.join(basePath, entry.name);
            if (await isChapterLike(p)) {
              baseChapters.push({ id: entry.name, title: entry.name, path: p });
            }
          }
        }
        if (baseChapters.length > 0) {
          results.push({ title: path.basename(basePath), path: basePath, chapters: baseChapters });
        }

        // Check subdirectories for series
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const seriesPath = path.join(basePath, entry.name);
            if (baseChapters.some(c => c.path === seriesPath)) continue;

            try {
              const subEntries = await fs.readdir(seriesPath, { withFileTypes: true });
              const chapters: any[] = [];
              for (const sub of subEntries) {
                if (sub.isDirectory() && await isChapterLike(path.join(seriesPath, sub.name))) {
                  chapters.push({ id: sub.name, title: sub.name, path: path.join(seriesPath, sub.name) });
                }
              }
              if (chapters.length > 0) {
                results.push({ title: entry.name, path: seriesPath, chapters: chapters });
              }
            } catch { }
          }
        }
        return results;
      } catch (err) {
        throw err;
      }
    });
  }
}

// Initialize the application
new MangaTechApp();