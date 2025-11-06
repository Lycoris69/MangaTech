/**
 * Constantes partagées entre backend et mobile
 */

const API_VERSION = 'v1';

const ENDPOINTS = {
  AUTH: {
    REGISTER: `/api/${API_VERSION}/auth/register`,
    LOGIN: `/api/${API_VERSION}/auth/login`,
    LOGOUT: `/api/${API_VERSION}/auth/logout`,
    REFRESH: `/api/${API_VERSION}/auth/refresh`
  },
  MANGA: {
    LIST: `/api/${API_VERSION}/mangas`,
    DETAIL: (id) => `/api/${API_VERSION}/mangas/${id}`,
    SEARCH: `/api/${API_VERSION}/mangas/search`
  },
  CHAPTER: {
    LIST: (mangaId) => `/api/${API_VERSION}/mangas/${mangaId}/chapters`,
    DETAIL: (mangaId, chapterId) => `/api/${API_VERSION}/mangas/${mangaId}/chapters/${chapterId}`
  },
  PROGRESS: {
    GET: (mangaId) => `/api/${API_VERSION}/progress/${mangaId}`,
    UPDATE: (mangaId) => `/api/${API_VERSION}/progress/${mangaId}`
  },
  BOOKMARK: {
    LIST: `/api/${API_VERSION}/bookmarks`,
    ADD: `/api/${API_VERSION}/bookmarks`,
    REMOVE: (id) => `/api/${API_VERSION}/bookmarks/${id}`
  },
  NOTIFICATION: {
    PREFERENCES: `/api/${API_VERSION}/notifications/preferences`,
    TOGGLE: (mangaId) => `/api/${API_VERSION}/notifications/toggle/${mangaId}`
  }
};

const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY'
};

const AUTO_SCROLL_SPEEDS = {
  SLOW: 1,
  NORMAL: 2,
  FAST: 3,
  VERY_FAST: 4
};

module.exports = {
  API_VERSION,
  ENDPOINTS,
  ERROR_CODES,
  AUTO_SCROLL_SPEEDS
};
