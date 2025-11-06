const cron = require('node-cron');
const db = require('../config/database');

class NotificationService {
  startNotificationChecker() {
    // Check for new chapters every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🔔 Checking for new chapters...');
      await this.checkForNewChapters();
    });

    console.log('✅ Notification checker started');
  }

  async checkForNewChapters() {
    try {
      // Get all mangas that users are following with notifications enabled
      const result = await db.query(`
        SELECT DISTINCT m.id, m.url, m.last_chapter_number
        FROM mangas m
        JOIN bookmarks b ON m.id = b.manga_id
        WHERE b.notifications_enabled = true
      `);

      for (const manga of result.rows) {
        // Here you would implement the logic to scrape the manga site
        // and check for new chapters
        // This is a placeholder for the actual implementation
        await this.checkMangaForUpdates(manga);
      }
    } catch (error) {
      console.error('Error checking for new chapters:', error);
    }
  }

  async checkMangaForUpdates(manga) {
    // Placeholder for manga scraping logic
    // In a real implementation, you would:
    // 1. Fetch the manga page
    // 2. Parse for new chapters
    // 3. Compare with last_chapter_number
    // 4. Create notifications for users if new chapters found
    console.log(`Checking updates for manga ${manga.id}`);
  }

  async createNotification(userId, mangaId, chapterId, message) {
    try {
      await db.query(
        `INSERT INTO notifications (user_id, manga_id, chapter_id, message) 
         VALUES ($1, $2, $3, $4)`,
        [userId, mangaId, chapterId, message]
      );
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

module.exports = new NotificationService();
