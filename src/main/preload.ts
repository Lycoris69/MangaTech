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
    getChapterPages: (chapterUrl: string) => Promise<any[]>;
    downloadChapter: (params: {
      seriesId: string;
      chapterId: string;
      seriesTitle: string;
      chapterTitle: string;
      basePath: string;
    }) => Promise<string>;
    getDownloadTasks: () => Promise<any[]>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  storage: {
    read: (filename: string) => ipcRenderer.invoke('storage:read', filename),
    write: (filename: string, data: any) => ipcRenderer.invoke('storage:write', filename, data),
  },
  scraper: {
    getTrendingContent: () => ipcRenderer.invoke('scraper:getTrendingContent'),
    getLatestReleases: (page?: number) => ipcRenderer.invoke('scraper:getLatestReleases', page),
    getHotScans: () => ipcRenderer.invoke('scraper:getHotScans'),
    searchSeries: (query: string) => ipcRenderer.invoke('scraper:searchSeries', query),
    getSeriesDetails: (seriesUrl: string) => ipcRenderer.invoke('scraper:getSeriesDetails', seriesUrl),
    getChapterPages: (chapterUrl: string) => ipcRenderer.invoke('scraper:getChapterPages', chapterUrl),
    downloadChapter: (params: any) => ipcRenderer.invoke('scraper:downloadChapter', params),
    getDownloadTasks: () => ipcRenderer.invoke('scraper:getDownloadTasks'),
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}