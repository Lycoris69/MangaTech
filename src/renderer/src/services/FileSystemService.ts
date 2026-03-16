import { Series, SeriesSearchResult, Chapter } from '../types'
import { IFileSystemService } from './index'

/**
 * FileSystemService - Handles local file system operations for manga storage
 * Currently a stub implementation to restore build stability.
 * TODO: Implement actual IPC calls to main process for file operations.
 */
export class FileSystemService implements IFileSystemService {
    async initialize(): Promise<void> {
        // Stub
    }

    async createSeriesDirectory(_series: Series | SeriesSearchResult): Promise<string> {
        return '/stub/series/path'
    }

    async createChapterDirectory(_series: Series | SeriesSearchResult, _chapter: Chapter): Promise<string> {
        return '/stub/chapter/path'
    }

    async getSeriesPath(_series: Series | SeriesSearchResult): Promise<string> {
        return '/stub/series/path'
    }

    async getChapterPath(_series: Series | SeriesSearchResult, _chapter: Chapter): Promise<string> {
        return '/stub/chapter/path'
    }

    getPageFilePath(chapterPath: string, pageNumber: number, extension: string = 'jpg'): string {
        return `${chapterPath}/page-${pageNumber.toString().padStart(3, '0')}.${extension}`
    }

    async deleteSeriesDirectory(_series: Series | SeriesSearchResult): Promise<void> {
        // Stub
    }

    async deleteChapterDirectory(_series: Series | SeriesSearchResult, _chapter: Chapter): Promise<void> {
        // Stub
    }

    async getDownloadedSeries(): Promise<string[]> {
        return []
    }

    async getDownloadedChapters(_series: Series | SeriesSearchResult): Promise<string[]> {
        return []
    }

    async isChapterDownloaded(_series: Series | SeriesSearchResult, _chapter: Chapter): Promise<boolean> {
        return false
    }

    async getSeriesSize(_series: Series | SeriesSearchResult): Promise<number> {
        return 0
    }

    async getTotalDownloadSize(): Promise<number> {
        return 0
    }

    async detectDuplicateFiles(): Promise<Map<string, string[]>> {
        return new Map()
    }

    async verifyFileIntegrity(_filePath: string): Promise<unknown> {
        return { isValid: true }
    }

    async verifyChapterIntegrity(_series: Series | SeriesSearchResult, _chapter: Chapter): Promise<unknown> {
        return { isValid: true }
    }

    async verifySeriesIntegrity(_series: Series | SeriesSearchResult): Promise<unknown> {
        return { isValid: true }
    }

    async calculateFileHash(_filePath: string): Promise<string> {
        return ''
    }

    async removeDuplicateFiles(_duplicates: Map<string, string[]>): Promise<unknown> {
        return { success: true }
    }

    async removeCorruptedFiles(_corruptedFiles: string[]): Promise<unknown> {
        return { success: true }
    }

    getDownloadsPath(): string {
        return '/stub/downloads'
    }
}

export const fileSystemService = new FileSystemService()
