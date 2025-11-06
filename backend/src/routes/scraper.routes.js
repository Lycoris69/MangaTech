/**
 * Scraper Routes
 * Routes pour le scraping de mangas et chapitres
 */

const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraper.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/scraper/chapters/:id/pages
 * Récupère les pages d'un chapitre (scrappe si nécessaire)
 * Query params: ?forceScrape=true pour forcer le re-scraping
 */
router.get('/chapters/:id/pages', scraperController.getChapterPages);

/**
 * POST /api/scraper/manga
 * Scrappe un manga complet (métadonnées + chapitres)
 * Body: { url: "https://manhwa.com/manga/..." }
 */
router.post('/manga', scraperController.scrapeManga);

/**
 * GET /api/scraper/cache/stats
 * Statistiques du cache (nombre de pages, taille)
 */
router.get('/cache/stats', scraperController.getCacheStats);

module.exports = router;
