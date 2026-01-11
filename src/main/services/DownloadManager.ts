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
    private readonly CONCURRENCY_LIMIT = 5

    constructor(scraperManager: ScraperManager, tasksFile: string) {
        this.scraperManager = scraperManager
        this.tasksFile = tasksFile

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
        onProgress?: (progress: number) => void
    ): Promise<string> {
        try {
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
                    chapterIds: [chapterId],
                    status: 'pending',
                    progress: 0,
                    estimatedTimeRemaining: 0,
                    downloadPath: chapterPath,
                    createdAt: new Date()
                }
                tasks.push(task)
            } else {
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

                        DownloadManager.logger.debug(`Downloading page ${page.pageNumber}/${totalPages}`, { imageUrl: page.imageUrl })
                        await this.downloadFile(page.imageUrl, filePath)
                        localPages.push(filePath)

                        downloadedPages++
                        const newProgress = Math.round((downloadedPages / totalWork) * 100)
                        if (newProgress !== task.progress) {
                            task.progress = newProgress
                            await this.saveTasks(tasks)
                            if (onProgress) onProgress(task.progress)
                        }
                    } catch (itemErr) {
                        DownloadManager.logger.error(`Failed to download page ${page.pageNumber}`, { error: itemErr, imageUrl: page.imageUrl })
                        throw itemErr
                    }
                }
            }

            // Start concurrent workers
            const workers = Array.from({ length: this.CONCURRENCY_LIMIT }, () => downloadWorker())
            await Promise.all(workers)

            task.status = 'completed'
            task.completedAt = new Date()
            await this.saveTasks(tasks)

            DownloadManager.logger.info('Download completed successfully', { chapterPath })
            return chapterPath
        } catch (err: any) {
            DownloadManager.logger.error('Download process failed', {
                error: err.message,
                stack: err.stack,
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
        }
    }

    private async downloadFile(url: string, dest: string): Promise<void> {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'Referer': 'https://manhwaz.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        const writer = fs.createWriteStream(dest)
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve)
            writer.on('error', reject)
        })
    }

    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '_').trim()
    }

    async getLocalChapterPages(chapterId: string): Promise<PageUrl[] | null> {
        try {
            const tasks = await this.loadTasks()
            // Match by ID or check if chapterId is in the list
            const task = tasks.find(t => t.id === chapterId || t.chapterIds.includes(chapterId))

            if (task && task.status === 'completed' && fs.existsSync(task.downloadPath)) {
                const files = fs.readdirSync(task.downloadPath)
                    .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()))
                    .sort() // Path names 001.jpg, 002.jpg etc will sort correctly

                return files.map((file, index) => ({
                    pageNumber: index + 1,
                    imageUrl: `manga-local:///${path.join(task.downloadPath, file)}`,
                    localPath: path.join(task.downloadPath, file)
                }))
            }
            return null
        } catch (err) {
            DownloadManager.logger.error('Failed to get local chapter pages', err)
            return null
        }
    }
}
