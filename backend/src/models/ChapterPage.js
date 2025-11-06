/**
 * ChapterPage Model
 * Gestion des pages de chapitres scrappées
 */

const db = require('../config/database');

class ChapterPage {
  /**
   * Sauvegarde les pages d'un chapitre scrappé
   * @param {number} chapterId - ID du chapitre
   * @param {Array} pages - Tableau de {pageNumber, imageUrl, width, height}
   */
  static async savePages(chapterId, pages) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Supprimer les anciennes pages si elles existent
      await client.query(
        'DELETE FROM chapter_pages WHERE chapter_id = $1',
        [chapterId]
      );
      
      // Insérer les nouvelles pages
      for (const page of pages) {
        await client.query(
          `INSERT INTO chapter_pages (chapter_id, page_number, image_url, image_width, image_height)
           VALUES ($1, $2, $3, $4, $5)`,
          [chapterId, page.pageNumber, page.imageUrl, page.width, page.height]
        );
      }
      
      await client.query('COMMIT');
      return pages.length;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Récupère toutes les pages d'un chapitre
   * @param {number} chapterId - ID du chapitre
   */
  static async getByChapterId(chapterId) {
    const result = await db.query(
      `SELECT id, page_number, image_url, image_width, image_height, 
              image_cached_path, file_size, cached_at
       FROM chapter_pages
       WHERE chapter_id = $1
       ORDER BY page_number ASC`,
      [chapterId]
    );
    
    return result.rows;
  }

  /**
   * Marque une page comme téléchargée (mode offline)
   * @param {number} pageId - ID de la page
   * @param {string} localPath - Chemin local du fichier
   * @param {number} fileSize - Taille du fichier en octets
   */
  static async markAsCached(pageId, localPath, fileSize) {
    const result = await db.query(
      `UPDATE chapter_pages
       SET image_cached_path = $1, file_size = $2, cached_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [localPath, fileSize, pageId]
    );
    
    return result.rows[0];
  }

  /**
   * Vérifie si un chapitre a déjà été scrappé
   * @param {number} chapterId - ID du chapitre
   */
  static async hasPages(chapterId) {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM chapter_pages WHERE chapter_id = $1',
      [chapterId]
    );
    
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Supprime les pages d'un chapitre
   * @param {number} chapterId - ID du chapitre
   */
  static async deleteByChapterId(chapterId) {
    const result = await db.query(
      'DELETE FROM chapter_pages WHERE chapter_id = $1',
      [chapterId]
    );
    
    return result.rowCount;
  }

  /**
   * Récupère les statistiques de cache
   */
  static async getCacheStats() {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_pages,
        COUNT(image_cached_path) as cached_pages,
        SUM(file_size) as total_size
       FROM chapter_pages`
    );
    
    return result.rows[0];
  }
}

module.exports = ChapterPage;
