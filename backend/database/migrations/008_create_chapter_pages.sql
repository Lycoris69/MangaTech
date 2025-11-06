-- Migration: Create chapter_pages table for storing scraped manga page images
-- This table stores individual page images for each chapter

CREATE TABLE IF NOT EXISTS chapter_pages (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  image_cached_path TEXT,           -- Local path if downloaded for offline mode
  file_size BIGINT,                  -- Size in bytes if cached
  cached_at TIMESTAMP,               -- When was it cached locally
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chapter_id, page_number)
);

-- Index for faster lookups by chapter
CREATE INDEX IF NOT EXISTS idx_chapter_pages_chapter_id ON chapter_pages(chapter_id);

-- Index for finding cached pages
CREATE INDEX IF NOT EXISTS idx_chapter_pages_cached ON chapter_pages(image_cached_path) WHERE image_cached_path IS NOT NULL;

COMMENT ON TABLE chapter_pages IS 'Stores individual page images scraped from manga sites';
COMMENT ON COLUMN chapter_pages.image_url IS 'Direct URL to the image from the source site';
COMMENT ON COLUMN chapter_pages.image_cached_path IS 'Local filesystem path if image is downloaded (for offline reading)';
