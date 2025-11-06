/**
 * Types et interfaces partagés entre backend et mobile
 * Permet de garder une cohérence dans les structures de données
 */

// Status de lecture d'un manga
const ReadingStatus = {
  NOT_STARTED: 'not_started',
  READING: 'reading',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  DROPPED: 'dropped'
};

// Status de téléchargement d'un chapitre
const DownloadStatus = {
  NOT_DOWNLOADED: 'not_downloaded',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  FAILED: 'failed'
};

// Status de notification
const NotificationStatus = {
  ENABLED: 'enabled',
  DISABLED: 'disabled'
};

module.exports = {
  ReadingStatus,
  DownloadStatus,
  NotificationStatus
};
