import fs from 'fs'
import path from 'path'
import axios from 'axios'
import winston from 'winston'
import { WebContents } from 'electron'
import { DownloadTask, PageUrl } from '../types'
import { ScraperManager } from './ScraperManager'

export class DownloadManager {
    private static logger: winston.Logger
    private scraperManager: ScraperManager
    private tasksFile: string
    private tasks: DownloadTask[] | null = null
    private webContents: WebContents | null = null
    private readonly CONCURRENCY_LIMIT = 4
    private readonly MAX_CONCURRENT_CHAPTERS = 1
    private activeChaptersCount = 0
    private chapterQueue: (() => void)[] = []
    private pausedTasks: Set<string> = new Set()
    private cancelledTasks: Set<string> = new Set()

    constructor(scraperManager: ScraperManager, tasksFile: string, logDirectory: string = 'logs') {
        this.scraperManager = scraperManager
        this.tasksFile = tasksFile

        if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory, { recursive: true })
        }

        if (!DownloadManager.logger) {
            DownloadManager.logger = winston.createLogger({
                level: 'info',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json()
                ),
                defaultMeta: { service: 'download-manager' },
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.simple()
                        )
                    }),
                    new winston.transports.File({
                        filename: path.join(logDirectory, 'combined.log')
                    })
                ]
            })
        }
    }

    public setWebContents(webContents: WebContents): void {
        this.webContents = webContents
    }

    private async loadTasks(): Promise<DownloadTask[]> {
        try {
            if (this.tasks) return this.tasks

            if (!fs.existsSync(this.tasksFile)) {
                const dir = path.dirname(this.tasksFile)
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                fs.writeFileSync(this.tasksFile, '[]')
                this.tasks = []
                return []
            }
            const data = fs.readFileSync(this.tasksFile, 'utf-8')
            this.tasks = JSON.parse(data)
            return this.tasks || []
        } catch (err) {
            DownloadManager.logger.error('Failed to load download tasks', err)
            return this.tasks || []
        }
    }

    private async saveTasks(tasks: DownloadTask[]): Promise<void> {
        try {
            this.tasks = tasks
            fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2))
            if (this.webContents) {
                this.webContents.send('download:tasks-updated', tasks)
            }
        } catch (err) {
            DownloadManager.logger.error('Failed to save download tasks', err)
        }
    }

    async getTasks(): Promise<DownloadTask[]> {
        return this.loadTasks()
    }

    async downloadChapter(
        seriesId: string,
        chapterId: string,
        seriesTitle: string,
        chapterTitle: string,
        baseDownloadPath: string,
        onProgress?: (progress: number) => void,
        force: boolean = false
    ): Promise<{ chapterPath: string; seriesPath: string }> {
        // Wait for a slot in the global chapter queue
        if (this.activeChaptersCount >= this.MAX_CONCURRENT_CHAPTERS) {
            DownloadManager.logger.info('Waiting for download slot...', { seriesTitle, chapterTitle });
            await new Promise<void>(resolve => this.chapterQueue.push(resolve));
        }

        this.activeChaptersCount++;

        try {
            if (this.pausedTasks.has(`${seriesId}-${chapterId}`)) {
                DownloadManager.logger.info('Chapter is paused, skipping execution', { seriesTitle, chapterTitle });
                this.activeChaptersCount--;
                const next = this.chapterQueue.shift();
                if (next) next();
                throw new Error('PAUSED');
            }
            DownloadManager.logger.info('Starting download', { seriesTitle, chapterTitle, seriesId, chapterId })

            // Create directory structure
            const sanitizedSeriesTitle = this.sanitizeFilename(seriesTitle)
            let mangaDir: string

            // Check if baseDownloadPath already ends with the series title to avoid nesting
            const normalizedBase = path.resolve(baseDownloadPath)
            if (normalizedBase.endsWith(sanitizedSeriesTitle)) {
                mangaDir = normalizedBase
            } else {
                mangaDir = path.join(normalizedBase, sanitizedSeriesTitle)
            }

            const chapterDirName = this.sanitizeFilename(chapterTitle)
            const chapterPath = path.join(mangaDir, chapterDirName)

            DownloadManager.logger.debug('Target directory', { chapterPath })

            if (!fs.existsSync(chapterPath)) {
                fs.mkdirSync(chapterPath, { recursive: true })
            }

            // Add task to tracking
            const tasks = await this.loadTasks()
            const taskId = `${seriesId}-${chapterId}`
            let task = tasks.find(t => t.id === taskId)

            if (!task) {
                task = {
                    id: taskId,
                    seriesId,
                    seriesTitle,
                    chapterIds: [chapterId],
                    chapterTitle,
                    status: 'pending',
                    progress: 0,
                    estimatedTimeRemaining: 0,
                    downloadPath: chapterPath,
                    createdAt: new Date()
                }
                tasks.push(task)
            } else {
                task.seriesTitle = seriesTitle
                task.chapterTitle = chapterTitle
                task.status = 'downloading'
                task.progress = 0
            }
            await this.saveTasks(tasks)

            // Get page URLs
            DownloadManager.logger.info('Fetching page URLs', { chapterId })
            const pages = await this.scraperManager.getChapterPages(chapterId)
            const totalPages = pages.length
            DownloadManager.logger.info(`Found ${totalPages} pages to download`)

            let downloadedPages = 0
            const localPages: string[] = []

            // Parallel download implementation
            const downloadQueue = [...pages]
            const totalWork = pages.length

            const downloadWorker = async () => {
                while (downloadQueue.length > 0) {
                    if (this.pausedTasks.has(taskId)) {
                        DownloadManager.logger.info('Download paused', { taskId });
                        break;
                    }
                    if (this.cancelledTasks.has(taskId)) {
                        DownloadManager.logger.info('Download cancelled', { taskId });
                        break;
                    }

                    const page = downloadQueue.shift()
                    if (!page) break

                    try {
                        let ext = '.jpg'
                        try {
                            const urlObj = new URL(page.imageUrl)
                            ext = path.extname(urlObj.pathname) || '.jpg'
                        } catch (e) {
                            DownloadManager.logger.warn('Failed to parse image URL for extension, defaulting to .jpg', { imageUrl: page.imageUrl })
                        }

                        const fileName = `${page.pageNumber.toString().padStart(3, '0')}${ext}`
                        const filePath = path.join(chapterPath, fileName)

                        // Check if file already exists (for resumption), unless force is true
                        if (!force && fs.existsSync(filePath)) {
                            const stats = fs.statSync(filePath);
                            if (stats.size > 0) {
                                DownloadManager.logger.debug(`File already exists, skipping: ${fileName}`);
                                localPages.push(filePath)
                                downloadedPages++
                                this.updateProgress(tasks, task, downloadedPages, totalWork, onProgress);
                                continue;
                            }
                        }

                        DownloadManager.logger.debug(`Downloading page ${page.pageNumber}/${totalPages}`, { imageUrl: page.imageUrl })
                        await this.downloadFile(page.imageUrl, filePath, taskId)
                        localPages.push(filePath)

                        downloadedPages++
                        const newProgress = Math.round((downloadedPages / totalWork) * 100)
                        if (newProgress !== task.progress) {
                            task.progress = newProgress
                            await this.saveTasks(tasks)
                            if (onProgress) onProgress(task.progress)
                        }

                        // Small delay to be less aggressive
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (itemErr) {
                        DownloadManager.logger.error(`Failed to download page ${page.pageNumber}`, { error: itemErr, imageUrl: page.imageUrl })
                        throw itemErr
                    }
                }
            }

            // Start concurrent workers
            const workers = Array.from({ length: this.CONCURRENCY_LIMIT }, () => downloadWorker())
            await Promise.all(workers)

            if (this.cancelledTasks.has(taskId)) {
                this.cancelledTasks.delete(taskId);
                task.status = 'failed';
                await this.saveTasks(tasks);
                throw new Error('CANCELLED');
            }

            if (this.pausedTasks.has(taskId)) {
                task.status = 'paused';
                await this.saveTasks(tasks);
                return { chapterPath, seriesPath: mangaDir };
            }

            task.status = 'completed'
            task.completedAt = new Date()
            await this.saveTasks(tasks)

            DownloadManager.logger.info('Download completed successfully', { chapterPath })
            return { chapterPath, seriesPath: mangaDir }
        } catch (err: unknown) {
            const error = err as Error;
            if (error.message === 'PAUSED') return { chapterPath: '', seriesPath: '' };
            if (error.message === 'CANCELLED') return { chapterPath: '', seriesPath: '' };

            DownloadManager.logger.error('Download process failed', {
                error: error.message,
                stack: error.stack,
                seriesTitle,
                chapterTitle
            })

            const tasks = await this.loadTasks()
            const taskId = `${seriesId}-${chapterId}`
            const task = tasks.find(t => t.id === taskId)
            if (task) {
                task.status = 'failed'
                await this.saveTasks(tasks)
            }

            throw err
        } finally {
            this.activeChaptersCount--;
            // Process next chapter in queue
            const next = this.chapterQueue.shift();
            if (next) next();
        }
    }

    private async updateProgress(tasks: DownloadTask[], task: DownloadTask, downloadedPages: number, totalWork: number, onProgress?: (progress: number) => void) {
        const newProgress = Math.round((downloadedPages / totalWork) * 100)
        if (newProgress !== task.progress) {
            task.progress = newProgress
            await this.saveTasks(tasks)
            if (onProgress) onProgress(task.progress)
        }
    }

    async pauseDownload(taskId: string): Promise<void> {
        DownloadManager.logger.info('Pausing download', { taskId });
        this.pausedTasks.add(taskId);
        const tasks = await this.loadTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'paused';
            await this.saveTasks(tasks);
        }
    }

    async resumeDownload(taskId: string, force: boolean = false): Promise<void> {
        DownloadManager.logger.info('Resuming download', { taskId });
        this.pausedTasks.delete(taskId);
        const tasks = await this.loadTasks();
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            task.status = 'pending';
            await this.saveTasks(tasks);

            // Re-trigger the download process
            const basePath = path.dirname(path.dirname(task.downloadPath));
            const chapterTitle = task.chapterTitle || task.id.split('-').pop() || 'Unknown';
            const seriesTitle = task.seriesTitle || 'Unknown';

            // We fire and forget here, the manager's queueing system in downloadChapter will handle concurrency
            this.downloadChapter(
                task.seriesId,
                task.chapterIds[0],
                seriesTitle,
                chapterTitle,
                basePath,
                undefined,
                force
            ).catch(err => {
                DownloadManager.logger.error('Failed to re-trigger download on resume', { taskId, error: err.message });
            });
        }
    }

    async retryDownload(taskId: string): Promise<void> {
        DownloadManager.logger.info('Retrying download (Hard Retry)', { taskId });
        const tasks = await this.loadTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            // Invalidate cache for this chapter before retrying
            await this.scraperManager.invalidateCache(task.chapterIds[0], 'chapter');
        }
        return this.resumeDownload(taskId, true);
    }

    async cancelDownload(taskId: string): Promise<void> {
        DownloadManager.logger.info('Cancelling download', { taskId });
        this.cancelledTasks.add(taskId);
        this.pausedTasks.delete(taskId);
        const tasks = await this.loadTasks();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const task = tasks[index];
            if (task.status === 'completed') {
                // If already completed, just remove it or keep it? 
                // Usually cancel means stop and remove if active.
            }
            tasks.splice(index, 1);
            await this.saveTasks(tasks);
        }
    }

    private async downloadFile(url: string, dest: string, taskId: string, attempts = 10): Promise<void> {
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 30000, // 30s timeout
                    headers: {
                        'Referer': 'https://manhwaz.com',
                        'Origin': 'https://manhwaz.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                })

                const writer = fs.createWriteStream(dest)
                response.data.pipe(writer)

                return await new Promise((resolve, reject) => {
                    writer.on('finish', resolve)
                    writer.on('error', reject)
                })
            } catch (err: unknown) {
                const error = err as any; // Still using any here for axios error status access, or I can use axios.isAxiosError
                const isLastAttempt = i === attempts - 1;
                const status = (error as { response?: { status: number } }).response?.status;

                if (isLastAttempt) throw err;

                // Cap exponential backoff at 30s instead of geometric growth
                const delay = Math.min(Math.pow(2, i + 1) * 1000, 30000);
                DownloadManager.logger.warn(`Download failed (Status: ${status}), retrying in ${delay / 1000}s...`, { url, attempt: i + 1, taskId });

                await this.sleep(delay, taskId);
            }
        }
    }

    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '_').trim()
    }

    async getLocalChapterPages(chapterId: string): Promise<PageUrl[] | null> {
        DownloadManager.logger.info(`getLocalChapterPages requested for: ${chapterId}`);
        try {
            const tasks = await this.loadTasks()
            DownloadManager.logger.debug(`Searching in ${tasks.length} tasks`);

            // Match by ID or check if chapterId is in the list with lenient fallback
            const task = tasks.find(t => {
                const isMatch = t.id === chapterId || t.chapterIds.includes(chapterId);

                if (!isMatch) {
                    // Lenient fallback: handle mismatches between full URLs and slugs/paths
                    try {
                        const normalize = (id: string) => id.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '')
                        const normalizedTarget = normalize(chapterId)
                        const subMatch = t.chapterIds.some(cid => normalize(cid) === normalizedTarget);
                        if (subMatch) {
                            DownloadManager.logger.debug(`Found lenient match for ${chapterId} in task ${t.id}`);
                            return true;
                        }
                    } catch {
                        return false
                    }
                }
                return isMatch;
            })

            if (task && task.status === 'completed' && fs.existsSync(task.downloadPath)) {
                DownloadManager.logger.info(`Found local task for ${chapterId} at ${task.downloadPath}`);
                const files = fs.readdirSync(task.downloadPath)
                    .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()))
                    .sort() // Path names 001.jpg, 002.jpg etc will sort correctly

                return files.map((file, index) => ({
                    pageNumber: index + 1,
                    imageUrl: `manga-local:///${path.join(task.downloadPath, file)}`,
                    localPath: path.join(task.downloadPath, file)
                }))
            }

            if (task) {
                DownloadManager.logger.warn(`Task found but NOT completed or path missing: ${task.id}`, { status: task.status, exists: fs.existsSync(task.downloadPath) });
            } else {
                DownloadManager.logger.debug(`No task found for ${chapterId}`);
            }

            return null
        } catch (err) {
            DownloadManager.logger.error('Failed to get local chapter pages', err)
            return null
        }
    }

    private async sleep(ms: number, taskId: string): Promise<void> {
        const checkInterval = 100;
        let elapsed = 0;
        while (elapsed < ms) {
            if (this.cancelledTasks.has(taskId)) throw new Error('CANCELLED');
            if (this.pausedTasks.has(taskId)) throw new Error('PAUSED');

            const remaining = ms - elapsed;
            const wait = Math.min(checkInterval, remaining);
            await new Promise(resolve => setTimeout(resolve, wait));
            elapsed += wait;
        }
    }
}
