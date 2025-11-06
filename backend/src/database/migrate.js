require('dotenv').config();
const db = require('../config/database');

const createTables = async () => {
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Mangas table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mangas (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        cover_image TEXT,
        description TEXT,
        status VARCHAR(50),
        last_chapter_number INTEGER,
        last_chapter_title VARCHAR(255),
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Bookmarks table (User's manga library)
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
        is_favorite BOOLEAN DEFAULT FALSE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, manga_id)
      );
    `);

    // Chapters table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
        chapter_number DECIMAL(10, 2) NOT NULL,
        title VARCHAR(255),
        url TEXT NOT NULL,
        release_date TIMESTAMP,
        page_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(manga_id, chapter_number)
      );
    `);

    // Reading progress table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
        manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER,
        is_completed BOOLEAN DEFAULT FALSE,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Downloaded chapters table (for offline mode)
    await db.query(`
      CREATE TABLE IF NOT EXISTS downloaded_chapters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
        local_path TEXT NOT NULL,
        file_size BIGINT,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Chapter pages table (for scraped images)
    await db.query(`
      CREATE TABLE IF NOT EXISTS chapter_pages (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        image_width INTEGER,
        image_height INTEGER,
        image_cached_path TEXT,
        file_size BIGINT,
        cached_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chapter_id, page_number)
      );
    `);

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_manga_id ON chapters(manga_id);
      CREATE INDEX IF NOT EXISTS idx_progress_user_id ON reading_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_chapter_pages_chapter_id ON chapter_pages(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_chapter_pages_cached ON chapter_pages(image_cached_path) WHERE image_cached_path IS NOT NULL;
    `);

    console.log('✅ All database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    // Close the pool connection
    await db.pool.end();
  }
};

// Run migrations
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { createTables };
