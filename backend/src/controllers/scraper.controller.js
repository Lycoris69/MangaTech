/**
 * Chapter Controller
 * Gestion des chapitres et scraping
 */

const scraperService = require('../services/scraper.service');
const ChapterPage = require('../models/ChapterPage');
const db = require('../config/database');

/**
 * Récupère les pages d'un chapitre
 * Si pas encore scrappées, déclenche le scraping
 */
exports.getChapterPages = async (req, res) => {
  try {
    const { id } = req.params;
    const { forceScrape } = req.query; // ?forceScrape=true pour forcer le re-scraping
    
    // Récupérer les infos du chapitre
    const chapterResult = await db.query(
      'SELECT * FROM chapters WHERE id = $1',
      [id]
    );
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    const chapter = chapterResult.rows[0];
    
    // Vérifier si déjà scrappé
    const hasPages = await ChapterPage.hasPages(id);
    
    if (!hasPages || forceScrape === 'true') {
      // Scraper le chapitre
      console.log(`Scraping chapter ${id} from ${chapter.url}`);
      
      try {
        const scrapedPages = await scraperService.scrapeChapter(chapter.url);
        
        if (scrapedPages.length === 0) {
          return res.status(500).json({ 
            error: 'No pages found. The site structure might have changed.' 
          });
        }
        
        // Sauvegarder en DB
        await ChapterPage.savePages(id, scrapedPages);
        
        // Mettre à jour le nombre de pages
        await db.query(
          'UPDATE chapters SET page_count = $1 WHERE id = $2',
          [scrapedPages.length, id]
        );
        
      } catch (scrapeError) {
        console.error('Scraping error:', scrapeError);
        return res.status(500).json({ 
          error: 'Failed to scrape chapter',
          details: scrapeError.message 
        });
      }
    }
    
    // Récupérer les pages
    const pages = await ChapterPage.getByChapterId(id);
    
    res.json({
      chapter: {
        id: chapter.id,
        manga_id: chapter.manga_id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        url: chapter.url,
        page_count: pages.length
      },
      pages: pages.map(p => ({
        id: p.id,
        pageNumber: p.page_number,
        imageUrl: p.image_url,
        width: p.image_width,
        height: p.image_height,
        isCached: !!p.image_cached_path,
        cachedPath: p.image_cached_path,
        cachedAt: p.cached_at
      }))
    });
    
  } catch (error) {
    console.error('Error getting chapter pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Scrape un manga complet (métadonnées + chapitres)
 */
exports.scrapeManga = async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.user.id;
    
    if (!url) {
      return res.status(400).json({ error: 'Manga URL is required' });
    }
    
    // Scraper les métadonnées
    console.log(`Scraping manga from ${url}`);
    const metadata = await scraperService.scrapeMangaMetadata(url);
    
    // Créer le manga en DB
    const mangaResult = await db.query(
      `INSERT INTO mangas (title, url, cover_image, description, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [metadata.title, url, metadata.coverUrl, metadata.description, metadata.status]
    );
    
    const manga = mangaResult.rows[0];
    
    // Ajouter au bookmark de l'utilisateur
    await db.query(
      `INSERT INTO bookmarks (user_id, manga_id)
       VALUES ($1, $2)`,
      [userId, manga.id]
    );
    
    // Scraper la liste des chapitres
    const chapters = await scraperService.scrapeChapterList(url);
    
    // Sauvegarder les chapitres
    for (const chapter of chapters) {
      await db.query(
        `INSERT INTO chapters (manga_id, chapter_number, title, url, release_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (manga_id, chapter_number) DO NOTHING`,
        [manga.id, chapter.chapterNumber, chapter.title, chapter.url, chapter.releaseDate]
      );
    }
    
    res.status(201).json({
      message: 'Manga scraped successfully',
      manga: {
        id: manga.id,
        title: manga.title,
        coverUrl: manga.cover_image,
        chapterCount: chapters.length
      }
    });
    
  } catch (error) {
    console.error('Error scraping manga:', error);
    res.status(500).json({ 
      error: 'Failed to scrape manga',
      details: error.message 
    });
  }
};

/**
 * Obtient les statistiques de cache
 */
exports.getCacheStats = async (req, res) => {
  try {
    const stats = await ChapterPage.getCacheStats();
    
    res.json({
      totalPages: parseInt(stats.total_pages),
      cachedPages: parseInt(stats.cached_pages),
      totalSize: parseInt(stats.total_size || 0),
      totalSizeMB: Math.round((stats.total_size || 0) / 1024 / 1024 * 100) / 100
    });
    
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
