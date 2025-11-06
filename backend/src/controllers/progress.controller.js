const db = require('../config/database');

class ProgressController {
  async getUserProgress(req, res) {
    try {
      const userId = req.user.id;
      const { manga_id } = req.query;

      let query = `
        SELECT rp.*, c.chapter_number, c.title as chapter_title, m.title as manga_title
        FROM reading_progress rp
        JOIN chapters c ON rp.chapter_id = c.id
        JOIN mangas m ON rp.manga_id = m.id
        WHERE rp.user_id = $1
      `;
      
      const params = [userId];

      if (manga_id) {
        query += ' AND rp.manga_id = $2';
        params.push(manga_id);
      }

      query += ' ORDER BY rp.last_read_at DESC';

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }

  async updateProgress(req, res) {
    try {
      const userId = req.user.id;
      const { chapter_id, manga_id, current_page, total_pages, is_completed } = req.body;

      const result = await db.query(
        `INSERT INTO reading_progress (user_id, chapter_id, manga_id, current_page, total_pages, is_completed) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (user_id, chapter_id) 
         DO UPDATE SET 
           current_page = EXCLUDED.current_page,
           total_pages = EXCLUDED.total_pages,
           is_completed = EXCLUDED.is_completed,
           last_read_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, chapter_id, manga_id, current_page, total_pages, is_completed || false]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }

  async getLastRead(req, res) {
    try {
      const userId = req.user.id;
      const { manga_id } = req.params;

      const result = await db.query(
        `SELECT rp.*, c.chapter_number, c.title as chapter_title, c.url
         FROM reading_progress rp
         JOIN chapters c ON rp.chapter_id = c.id
         WHERE rp.user_id = $1 AND rp.manga_id = $2
         ORDER BY rp.last_read_at DESC
         LIMIT 1`,
        [userId, manga_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No reading progress found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get last read error:', error);
      res.status(500).json({ error: 'Failed to fetch last read' });
    }
  }
}

module.exports = new ProgressController();
