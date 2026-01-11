// @ts-ignore
import * as electron from 'electron';
const { app, BrowserWindow, ipcMain, session, dialog, protocol, net } = require('electron');
import * as path from 'path';
import * as fs from 'fs/promises';
import { ScraperManager } from './services/ScraperManager';
import { DownloadManager } from './services/DownloadManager';

class MangaTechApp {
  private mainWindow: electron.BrowserWindow | null = null;
  private scraperManager: ScraperManager;
  private downloadManager: DownloadManager;
  private readonly dataDir: string;

  constructor() {
    this.scraperManager = new ScraperManager();
    // Use user data directory or local data directory for development
    this.dataDir = path.join(process.cwd(), 'data');
    this.downloadManager = new DownloadManager(
      this.scraperManager,
      path.join(this.dataDir, 'download-tasks.json')
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
    app.on('web-contents-created', (_, contents) => {
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
      show: false, // Don't show until ready
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      // DevTools disabled as requested by user
      // this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private registerLocalProtocol(): void {
    protocol.handle('manga-local', (request) => {
      const url = request.url.replace('manga-local:///', '');
      return net.fetch('file:///' + decodeURIComponent(url));
    });
  }

  private setupWebRequestInterceptors(): void {
    // Intercept requests to manhwaz.com and its CDN to add Referer and Origin headers
    // This bypasses hotlink protection (Requirement 5.4)
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.manhwaz.com/*', '*://manhwaz.com/*'] },
      (details, callback) => {
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
      (details, callback) => {
        const headers = { ...details.responseHeaders };

        // Ensure Access-Control-Allow-Origin is set to allow the renderer to read images if needed
        headers['Access-Control-Allow-Origin'] = ['*'];

        callback({ cancel: false, responseHeaders: headers });
      }
    );
  }

  private setupIpcHandlers(): void {
    // Example IPC handler for future use
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });

    // --- Storage Handlers ---
    ipcMain.handle('storage:read', async (_, filename: string) => {
      try {
        const filePath = path.join(this.dataDir, filename);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        // Return null if file doesn't exist
        return null;
      }
    });

    ipcMain.handle('storage:write', async (_, filename: string, data: any) => {
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
    ipcMain.handle('scraper:getTrendingContent', async () => {
      try {
        return await this.scraperManager.getTrendingContent();
      } catch (error) {
        console.error('Failed to get trending content:', error);
        throw error;
      }
    });

    // Get latest releases only (paged)
    ipcMain.handle('scraper:getLatestReleases', async (_, page: number = 1) => {
      try {
        return await this.scraperManager.getLatestReleases(page);
      } catch (error) {
        console.error(`Failed to get latest releases for page ${page}:`, error);
        throw error;
      }
    });

    // Get hot scans only
    ipcMain.handle('scraper:getHotScans', async () => {
      try {
        const trending = await this.scraperManager.getTrendingContent();
        return trending.hotSeries;
      } catch (error) {
        console.error('Failed to get hot scans:', error);
        throw error;
      }
    });

    // Search for series
    ipcMain.handle('scraper:searchSeries', async (_, query: string) => {
      try {
        return await this.scraperManager.searchSeries(query);
      } catch (error) {
        console.error(`Failed to search for "${query}":`, error);
        throw error;
      }
    });

    // Get series details
    ipcMain.handle('scraper:getSeriesDetails', async (_, seriesUrl: string) => {
      try {
        // ScraperManager handles both IDs and full URLs
        return await this.scraperManager.getSeriesDetails(seriesUrl);
      } catch (error) {
        console.error(`Failed to get series details for "${seriesUrl}":`, error);
        throw error;
      }
    });

    // Get chapter pages
    ipcMain.handle('scraper:getChapterPages', async (_, chapterUrl: string) => {
      try {
        // Attempt to load from local storage first
        const localPages = await this.downloadManager.getLocalChapterPages(chapterUrl);
        if (localPages && localPages.length > 0) {
          console.log(`Serving local pages for: ${chapterUrl}`);
          return localPages;
        }

        // Fallback to online scraper
        return await this.scraperManager.getChapterPages(chapterUrl);
      } catch (error) {
        console.error(`Failed to get chapter pages for "${chapterUrl}":`, error);
        throw error;
      }
    });

    // --- Download Handlers ---

    ipcMain.handle('dialog:selectDirectory', async () => {
      console.log('[IPC] dialog:selectDirectory requested');
      try {
        // On some Linux systems, passing the parent window can cause GLib/Gtk signal issues (e.g. no handler error).
        // Calling it without a parent can be more stable in those environments.
        const result = await dialog.showOpenDialog({
          title: 'Select Download Directory',
          properties: ['openDirectory', 'createDirectory'],
          buttonLabel: 'Select Folder'
        });

        console.log('[IPC] dialog:selectDirectory result:', result.canceled ? 'Canceled' : result.filePaths[0]);
        if (result.canceled) return null;
        return result.filePaths[0];
      } catch (error) {
        console.error('[IPC] dialog:selectDirectory error:', error);
        return null;
      }
    });

    ipcMain.handle('scraper:downloadChapter', async (_, { seriesId, chapterId, seriesTitle, chapterTitle, basePath }) => {
      console.log(`[IPC] scraper:downloadChapter: ${seriesTitle} - ${chapterTitle}`);
      try {
        const result = await this.downloadManager.downloadChapter(
          seriesId,
          chapterId,
          seriesTitle,
          chapterTitle,
          basePath
        );
        console.log(`[IPC] scraper:downloadChapter: Success: ${result}`);
        return result;
      } catch (error) {
        console.error('[IPC] scraper:downloadChapter: Execution failed:', error);
        throw error;
      }
    });

    ipcMain.handle('scraper:getDownloadTasks', async () => {
      try {
        return await this.downloadManager.getTasks();
      } catch (error) {
        console.error('[IPC] scraper:getDownloadTasks error:', error);
        throw error;
      }
    });
  }
}

// Initialize the application
new MangaTechApp();