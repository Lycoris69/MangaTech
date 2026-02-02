import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  storage: {
    read: (filename: string) => Promise<unknown>;
    write: (filename: string, data: unknown) => Promise<boolean>;
  };
  scraper: {
    getTrendingContent: () => Promise<unknown>;
    getLatestReleases: (page?: number) => Promise<unknown[]>;
    getHotScans: () => Promise<unknown[]>;
    searchSeries: (query: string) => Promise<unknown[]>;
    getSeriesDetails: (seriesUrl: string) => Promise<unknown>;
    getChapterPages: (chapterUrl: string, seriesId?: string) => Promise<unknown[]>;
    downloadChapter: (params: {
      seriesId: string;
      chapterId: string;
      seriesTitle: string;
      chapterTitle: string;
      basePath: string;
    }) => Promise<string>;
    getDownloadTasks: () => Promise<unknown[]>;
    pauseDownload: (taskId: string) => Promise<void>;
    resumeDownload: (taskId: string) => Promise<void>;
    cancelDownload: (taskId: string) => Promise<void>;
    retryDownload: (taskId: string) => Promise<void>;
    scanLocalDownloads: (basePath: string) => Promise<unknown[]>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
}

// Helper to log IPC calls in renderer
const logIpc = async (channel: string, ...args: unknown[]) => {
  console.debug(`[Renderer:IPC:Request] ${channel}`, ...args);
  try {
    const result = await ipcRenderer.invoke(channel, ...args);
    console.debug(`[Renderer:IPC:Response] ${channel}`, result);
    return result;
  } catch (error) {
    console.error(`[Renderer:IPC:Error] ${channel}`, error);
    throw error;
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  getVersion: () => logIpc('app:getVersion'),
  getPlatform: () => logIpc('app:getPlatform'),
  storage: {
    read: (filename: string) => logIpc('storage:read', filename),
    write: (filename: string, data: any) => logIpc('storage:write', filename, data),
  },
  scraper: {
    getTrendingContent: () => logIpc('scraper:getTrendingContent'),
    getLatestReleases: (page?: number) => logIpc('scraper:getLatestReleases', page),
    getHotScans: () => logIpc('scraper:getHotScans'),
    searchSeries: (query: string) => logIpc('scraper:searchSeries', query),
    getSeriesDetails: (seriesUrl: string) => logIpc('scraper:getSeriesDetails', seriesUrl),
    getChapterPages: (chapterUrl: string, seriesId?: string) => logIpc('scraper:getChapterPages', chapterUrl, seriesId),
    downloadChapter: (params: unknown) => logIpc('scraper:downloadChapter', params),
    getDownloadTasks: () => logIpc('scraper:getDownloadTasks'),
    pauseDownload: (taskId: string) => logIpc('scraper:pauseDownload', taskId),
    resumeDownload: (taskId: string) => logIpc('scraper:resumeDownload', taskId),
    cancelDownload: (taskId: string) => logIpc('scraper:cancelDownload', taskId),
    retryDownload: (taskId: string) => logIpc('scraper:retryDownload', taskId),
    scanLocalDownloads: (basePath: string) => logIpc('scraper:scanLocalDownloads', basePath),
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
      console.debug(`[Renderer:IPC:Event] ${channel}`, ...args);
      callback(...args);
    };
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  dialog: {
    selectDirectory: () => logIpc('dialog:selectDirectory'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}