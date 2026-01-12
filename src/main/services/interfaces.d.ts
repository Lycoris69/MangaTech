import { Series, SeriesSearchResult, TrendingContent, PageUrl } from '../../types';
export interface RateLimitConfig {
    requestsPerSecond: number;
    burstLimit: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface WebScrapingService {
    searchSeries(query: string): Promise<SeriesSearchResult[]>;
    getSeriesDetails(seriesId: string): Promise<Series>;
    getTrendingContent(): Promise<TrendingContent>;
    getLatestReleases(page?: number): Promise<any[]>;
    getChapterPages(chapterId: string): Promise<PageUrl[]>;
    validateSource(sourceUrl: string): Promise<boolean>;
}
export declare class ScrapingError extends Error {
    readonly sourceUrl?: string;
    readonly statusCode?: number;
    constructor(message: string, sourceUrl?: string, statusCode?: number);
}
export declare class RateLimitError extends ScrapingError {
    constructor(message: string, sourceUrl?: string);
}
export declare class ValidationError extends ScrapingError {
    constructor(message: string, sourceUrl?: string);
}
//# sourceMappingURL=interfaces.d.ts.map