import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  storage: {
    read: (filename: string) => Promise<any>;
    write: (filename: string, data: any) => Promise<boolean>;
  };
  scraper: {
    getTrendingContent: () => Promise<any>;
    getLatestReleases: (page?: number) => Promise<any[]>;
    getHotScans: () => Promise<any[]>;
    searchSeries: (query: string) => Promise<any[]>;
    getSeriesDetails: (seriesUrl: string) => Promise<any>;
    getChapterPages: (chapterUrl: string, seriesId?: string) => Promise<any[]>;
    downloadChapter: (params: {
      seriesId: string;
      chapterId: string;
      seriesTitle: string;
      chapterTitle: string;
      basePath: string;
    }) => Promise<string>;
    getDownloadTasks: () => Promise<any[]>;
    scanLocalDownloads: (basePath: string) => Promise<any[]>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
}

// Helper to log IPC calls in renderer
const logIpc = async (channel: string, ...args: any[]) => {
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
    downloadChapter: (params: any) => logIpc('scraper:downloadChapter', params),
    getDownloadTasks: () => logIpc('scraper:getDownloadTasks'),
    scanLocalDownloads: (basePath: string) => logIpc('scraper:scanLocalDownloads', basePath),
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => {
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