const db = require('../config/database');

class ChapterController {
  async getChaptersByManga(req, res) {
    try {
      const { manga_id } = req.params;

      const result = await db.query(
        `SELECT * FROM chapters 
         WHERE manga_id = $1 
         ORDER BY chapter_number DESC`,
        [manga_id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Get chapters error:', error);
      res.status(500).json({ error: 'Failed to fetch chapters' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'SELECT * FROM chapters WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get chapter error:', error);
      res.status(500).json({ error: 'Failed to fetch chapter' });
    }
  }

  async create(req, res) {
    try {
      const { manga_id, chapter_number, title, url, release_date, page_count } = req.body;

      const result = await db.query(
        `INSERT INTO chapters (manga_id, chapter_number, title, url, release_date, page_count) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (manga_id, chapter_number) 
         DO UPDATE SET 
           title = EXCLUDED.title,
           url = EXCLUDED.url,
           release_date = EXCLUDED.release_date,
           page_count = EXCLUDED.page_count
         RETURNING *`,
        [manga_id, chapter_number, title, url, release_date, page_count]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create chapter error:', error);
      res.status(500).json({ error: 'Failed to create chapter' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM chapters WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      res.json({ message: 'Chapter deleted successfully' });
    } catch (error) {
      console.error('Delete chapter error:', error);
      res.status(500).json({ error: 'Failed to delete chapter' });
    }
  }
}

module.exports = new ChapterController();
