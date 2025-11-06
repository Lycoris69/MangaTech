const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const mangaRoutes = require('./routes/manga.routes');
const bookmarkRoutes = require('./routes/bookmark.routes');
const chapterRoutes = require('./routes/chapter.routes');
const progressRoutes = require('./routes/progress.routes');
const notificationRoutes = require('./routes/notification.routes');
const scraperRoutes = require('./routes/scraper.routes');

// Import services
const notificationService = require('./services/notification.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mangas', mangaRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scraper', scraperRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MangaTech API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start notification checker
notificationService.startNotificationChecker();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MangaTech API server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
