const db = require('../config/database');

class MangaController {
  async getAll(req, res) {
    try {
      const result = await db.query(
        'SELECT * FROM mangas ORDER BY updated_at DESC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Get all mangas error:', error);
      res.status(500).json({ error: 'Failed to fetch mangas' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(
        'SELECT * FROM mangas WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Manga not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get manga error:', error);
      res.status(500).json({ error: 'Failed to fetch manga' });
    }
  }

  async create(req, res) {
    try {
      const { title, url, cover_image, description, status } = req.body;

      const result = await db.query(
        `INSERT INTO mangas (title, url, cover_image, description, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [title, url, cover_image, description, status]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create manga error:', error);
      res.status(500).json({ error: 'Failed to create manga' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, url, cover_image, description, status, last_chapter_number, last_chapter_title } = req.body;

      const result = await db.query(
        `UPDATE mangas 
         SET title = COALESCE($1, title),
             url = COALESCE($2, url),
             cover_image = COALESCE($3, cover_image),
             description = COALESCE($4, description),
             status = COALESCE($5, status),
             last_chapter_number = COALESCE($6, last_chapter_number),
             last_chapter_title = COALESCE($7, last_chapter_title),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [title, url, cover_image, description, status, last_chapter_number, last_chapter_title, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Manga not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update manga error:', error);
      res.status(500).json({ error: 'Failed to update manga' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM mangas WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Manga not found' });
      }

      res.json({ message: 'Manga deleted successfully' });
    } catch (error) {
      console.error('Delete manga error:', error);
      res.status(500).json({ error: 'Failed to delete manga' });
    }
  }
}

module.exports = new MangaController();
