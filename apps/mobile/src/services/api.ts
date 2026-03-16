import axios from 'axios';
import { CONFIG } from '../constants/config';
import { 
  TrendingContent, 
  SeriesSearchResult, 
  Series, 
  PageUrl, 
  DownloadTask,
  UserLibrary
} from '../types';

const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: CONFIG.DEFAULT_TIMEOUT,
});

export const MangaApi = {
  // Scraper endpoints
  getTrending: async (): Promise<TrendingContent> => {
    const response = await api.get('/api/trending');
    return response.data;
  },

  getLatest: async (page: number = 1): Promise<SeriesSearchResult[]> => {
    const response = await api.get(`/api/latest?page=${page}`);
    return response.data;
  },

  search: async (query: string): Promise<SeriesSearchResult[]> => {
    const response = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getSeriesDetails: async (id: string): Promise<Series> => {
    const response = await api.get(`/api/series/${encodeURIComponent(id)}`);
    return response.data;
  },

  getChapterPages: async (id: string): Promise<PageUrl[]> => {
    const response = await api.get(`/api/chapters/${encodeURIComponent(id)}/pages`);
    return response.data;
  },

  // Download endpoints
  getDownloads: async (): Promise<DownloadTask[]> => {
    const response = await api.get('/api/downloads');
    return response.data;
  },

  triggerDownload: async (payload: {
    seriesId: string;
    chapterId: string;
    seriesTitle: string;
    chapterTitle: string;
  }) => {
    const response = await api.post('/api/downloads', payload);
    return response.data;
  },

  pauseDownload: async (id: string) => {
    const response = await api.post(`/api/downloads/${id}/pause`);
    return response.data;
  },

  resumeDownload: async (id: string) => {
    const response = await api.post(`/api/downloads/${id}/resume`);
    return response.data;
  },

  cancelDownload: async (id: string) => {
    const response = await api.post(`/api/downloads/${id}/cancel`);
    return response.data;
  },

  retryDownload: async (id: string) => {
    const response = await api.post(`/api/downloads/${id}/retry`);
    return response.data;
  },

  // Library endpoints
  getLibrary: async (): Promise<UserLibrary> => {
    const response = await api.get('/api/library');
    return response.data;
  },

  saveLibrary: async (library: UserLibrary) => {
    const response = await api.post('/api/library', library);
    return response.data;
  },
};
