const db = require('../config/database');

class BookmarkController {
  async getUserBookmarks(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT b.*, m.* 
         FROM bookmarks b
         JOIN mangas m ON b.manga_id = m.id
         WHERE b.user_id = $1
         ORDER BY b.updated_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Get bookmarks error:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  }

  async addBookmark(req, res) {
    try {
      const userId = req.user.id;
      const { manga_id, is_favorite, notifications_enabled } = req.body;

      const result = await db.query(
        `INSERT INTO bookmarks (user_id, manga_id, is_favorite, notifications_enabled) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id, manga_id) 
         DO UPDATE SET 
           is_favorite = EXCLUDED.is_favorite,
           notifications_enabled = EXCLUDED.notifications_enabled,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, manga_id, is_favorite || false, notifications_enabled !== false]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Add bookmark error:', error);
      res.status(500).json({ error: 'Failed to add bookmark' });
    }
  }

  async updateBookmark(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { is_favorite, notifications_enabled } = req.body;

      const result = await db.query(
        `UPDATE bookmarks 
         SET is_favorite = COALESCE($1, is_favorite),
             notifications_enabled = COALESCE($2, notifications_enabled),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [is_favorite, notifications_enabled, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update bookmark error:', error);
      res.status(500).json({ error: 'Failed to update bookmark' });
    }
  }

  async deleteBookmark(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      res.json({ message: 'Bookmark deleted successfully' });
    } catch (error) {
      console.error('Delete bookmark error:', error);
      res.status(500).json({ error: 'Failed to delete bookmark' });
    }
  }
}

module.exports = new BookmarkController();
