import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(email, password, username) {
    const response = await api.post('/auth/register', { email, password, username });
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async getCurrentUser() {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  }
};

export const mangaService = {
  async getAll() {
    const response = await api.get('/mangas');
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/mangas/${id}`);
    return response.data;
  },

  async create(mangaData) {
    const response = await api.post('/mangas', mangaData);
    return response.data;
  },

  async update(id, mangaData) {
    const response = await api.put(`/mangas/${id}`, mangaData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/mangas/${id}`);
    return response.data;
  }
};

export const bookmarkService = {
  async getAll() {
    const response = await api.get('/bookmarks');
    return response.data;
  },

  async add(mangaId, isFavorite = false, notificationsEnabled = true) {
    const response = await api.post('/bookmarks', {
      manga_id: mangaId,
      is_favorite: isFavorite,
      notifications_enabled: notificationsEnabled
    });
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/bookmarks/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/bookmarks/${id}`);
    return response.data;
  }
};

export const chapterService = {
  async getByManga(mangaId) {
    const response = await api.get(`/chapters/manga/${mangaId}`);
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/chapters/${id}`);
    return response.data;
  },

  async create(chapterData) {
    const response = await api.post('/chapters', chapterData);
    return response.data;
  }
};

export const progressService = {
  async getAll(mangaId = null) {
    const url = mangaId ? `/progress?manga_id=${mangaId}` : '/progress';
    const response = await api.get(url);
    return response.data;
  },

  async update(chapterId, mangaId, currentPage, totalPages, isCompleted = false) {
    const response = await api.post('/progress', {
      chapter_id: chapterId,
      manga_id: mangaId,
      current_page: currentPage,
      total_pages: totalPages,
      is_completed: isCompleted
    });
    return response.data;
  },

  async getLastRead(mangaId) {
    const response = await api.get(`/progress/manga/${mangaId}/last`);
    return response.data;
  }
};

export const notificationService = {
  async getAll(isRead = null) {
    const url = isRead !== null ? `/notifications?is_read=${isRead}` : '/notifications';
    const response = await api.get(url);
    return response.data;
  },

  async markAsRead(id) {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};
