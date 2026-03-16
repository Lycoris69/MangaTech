import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { ScraperManager } from './services/ScraperManager.js';
import { DownloadManager } from './services/DownloadManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, '../data');
const LOG_DIR = path.join(__dirname, '../logs');

async function startServer() {
  const server = fastify({ logger: true });

  // Ensure directories exist
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(LOG_DIR, { recursive: true });

  // Initialize Services
  const scraperManager = new ScraperManager(undefined, LOG_DIR);
  const downloadManager = new DownloadManager(
    scraperManager,
    path.join(DATA_DIR, 'download-tasks.json'),
    LOG_DIR
  );

  // Register Plugins
  await server.register(cors, { origin: '*' });

  // Add Request Logger
  server.addHook('onRequest', async (request, reply) => {
    const logMsg = `[${new Date().toISOString()}] ${request.method} ${request.url}\n`;
    await fs.appendFile(path.join(LOG_DIR, 'requests.log'), logMsg);
  });

  // Global 404 Logger
  server.setNotFoundHandler(async (request, reply) => {
    const logMsg = `[404 NOT FOUND] ${request.method} ${request.url}\n`;
    await fs.appendFile(path.join(LOG_DIR, 'requests.log'), logMsg);
    reply.code(404).send({ error: 'Route not found', url: request.url });
  });

  // Serve static manga files
  await server.register(fastifyStatic, {
    root: DATA_DIR,
    prefix: '/static/',
    decorateReply: false
  });

  // --- API Routes ---

  // Trending Content
  server.get('/api/trending', async () => {
    return await scraperManager.getTrendingContent();
  });

  // Latest Releases
  server.get('/api/latest', async (request: any) => {
    const page = Number(request.query.page) || 1;
    return await scraperManager.getLatestReleases(page);
  });

  // Search
  server.get('/api/search', async (request: any) => {
    const { q } = request.query as { q: string };
    if (!q) throw new Error('Query parameter "q" is required');
    return await scraperManager.searchSeries(q);
  });

  // Series Details
  server.get('/api/series/:id', async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const decodedId = decodeURIComponent(id);
    
    // Log the request
    const logMsg = `[API] Fetching series details for: "${id}" (decoded: "${decodedId}")\n`;
    await fs.appendFile(path.join(LOG_DIR, 'requests.log'), logMsg);

    try {
      const details = await scraperManager.getSeriesDetails(decodedId);
      if (!details) {
        console.warn(`[API] Series not found: ${decodedId}`);
        return reply.code(404).send({ error: 'Series not found' });
      }
      return details;
    } catch (err: any) {
      console.error(`[API] Error fetching series ${decodedId}:`, err.message);
      return reply.code(500).send({ error: err.message });
    }
  });

  // Chapter Pages
  server.get('/api/chapters/:id/pages', async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const decodedId = decodeURIComponent(id);
    
    console.log(`[API] Fetching pages for chapter: ${decodedId}`);
    try {
      // First try local
      const localPages = await downloadManager.getLocalChapterPages(decodedId);
      if (localPages && localPages.length > 0) {
        console.log(`[API] Serving local pages for ${decodedId}`);
        return localPages;
      }
      
      // Fallback to online
      const pages = await scraperManager.getChapterPages(decodedId);
      console.log(`[API] Fetched ${pages.length} pages online for ${decodedId}`);
      return pages;
    } catch (err: any) {
      console.error(`[API] Error fetching chapter pages for ${decodedId}:`, err.message);
      return reply.code(500).send({ error: err.message });
    }
  });

  // --- Download Routes ---

  // Get Tasks
  server.get('/api/downloads', async () => {
    return await downloadManager.getTasks();
  });

  // Trigger Download
  server.post('/api/downloads', async (request: any) => {
    const { seriesId, chapterId, seriesTitle, chapterTitle } = request.body as any;
    
    // We launch it in background
    downloadManager.downloadChapter(
      seriesId,
      chapterId,
      seriesTitle,
      chapterTitle,
      path.join(DATA_DIR, 'manga')
    ).catch(err => {
      server.log.error(`Download failed: ${err.message}`);
    });

    return { status: 'started', taskId: `${seriesId}-${chapterId}` };
  });

  // Pause/Resume/Cancel/Retry
  server.post('/api/downloads/:id/pause', async (request: any) => {
    await downloadManager.pauseDownload(request.params.id);
    return { status: 'paused' };
  });

  server.post('/api/downloads/:id/resume', async (request: any) => {
    await downloadManager.resumeDownload(request.params.id);
    return { status: 'resumed' };
  });

  server.post('/api/downloads/:id/cancel', async (request: any) => {
    await downloadManager.cancelDownload(request.params.id);
    return { status: 'cancelled' };
  });

  server.post('/api/downloads/:id/retry', async (request: any) => {
    await downloadManager.retryDownload(request.params.id);
    return { status: 'retrying' };
  });

  // --- Library Routes ---

  // Load Library
  server.get('/api/library', async () => {
    try {
      const data = await fs.readFile(path.join(DATA_DIR, 'user-library.json'), 'utf-8');
      return JSON.parse(data);
    } catch {
      return { favorites: [], downloads: [], readingProgress: [], preferences: {} };
    }
  });

  // Save Library
  server.post('/api/library', async (request: any) => {
    await fs.writeFile(
      path.join(DATA_DIR, 'user-library.json'),
      JSON.stringify(request.body, null, 2),
      'utf-8'
    );
    return { status: 'saved' };
  });

  // Start listening
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`MangaTech Server running at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startServer();
