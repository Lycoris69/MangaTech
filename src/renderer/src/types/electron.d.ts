// Type declarations for Electron API
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };