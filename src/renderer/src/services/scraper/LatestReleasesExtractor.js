"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatestReleasesExtractor = void 0;
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
const Logger_1 = require("./Logger");
const interfaces_1 = require("./interfaces");
class LatestReleasesExtractor {
    constructor(urlManager, rateLimiter, contentValidator) {
        this.cache = new Map();
        this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL (Requirement 1.3)
        this.urlManager = urlManager;
        this.rateLimiter = rateLimiter;
        this.contentValidator = contentValidator;
        // Initialize logger
        if (!LatestReleasesExtractor.logger) {
            LatestReleasesExtractor.logger = Logger_1.Logger.create('latest-releases-extractor');
        }
        // Configure axios instance
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://manhwaz.com/',
                'Origin': 'https://manhwaz.com'
            }
        });
        // Add request interceptor for rate limiting
        this.axiosInstance.interceptors.request.use(async (config) => {
            await this.rateLimiter.acquireToken();
            LatestReleasesExtractor.logger.debug('Making HTTP request for latest releases', { url: config.url });
            return config;
        });
        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use((response) => response, (error) => {
            LatestReleasesExtractor.logger.error('HTTP request failed for latest releases', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message
            });
            return Promise.reject(error);
        });
    }
    /**
     * Extract latest releases from manhwaz.com homepage
     */
    async extractLatestReleases(page = 1) {
        const cacheKey = `latest-releases-page-${page}`;
        // Check cache first
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            LatestReleasesExtractor.logger.info('Returning cached latest releases', { page, count: cached.length });
            return cached;
        }
        try {
            const homeUrl = this.urlManager.buildHomepageUrl(page);
            LatestReleasesExtractor.logger.info('Extracting latest releases from homepage', { url: homeUrl, page });
            const response = await this.axiosInstance.get(homeUrl);
            const $ = cheerio.load(response.data);
            const releases = await this.parseLatestReleasesSection($);
            // Validate extracted data
            const validationResult = this.contentValidator.validateLatestReleases(releases);
            if (!validationResult.isValid) {
                throw new interfaces_1.ValidationError(`Latest releases validation failed for page ${page}: ${validationResult.errors.join(', ')}`);
            }
            // Cache the results
            this.setCachedData(cacheKey, releases);
            LatestReleasesExtractor.logger.info('Successfully extracted latest releases', {
                page,
                count: releases.length,
                cached: true
            });
            return releases;
        }
        catch (error) {
            LatestReleasesExtractor.logger.error('Failed to extract latest releases', {
                page,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            if (error instanceof interfaces_1.ValidationError || error instanceof interfaces_1.ScrapingError) {
                throw error;
            }
            throw new interfaces_1.ScrapingError(`Failed to extract latest releases for page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse the latest releases section from the homepage HTML
     */
    async parseLatestReleasesSection($) {
        const releases = [];
        // Common selectors for latest releases sections on manhwaz.com
        const possibleSelectors = [
            '.page-item-detail',
            '.item.col-4.col-md-2',
            '.item.col-md-2',
            '.item.col-4',
            '.latest-releases .item',
            '.recent-updates .item'
        ];
        let releaseElements = null;
        // Try different selectors to find the latest releases section
        for (const selector of possibleSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                releaseElements = elements;
                LatestReleasesExtractor.logger.debug('Found latest releases using selector', {
                    selector,
                    count: elements.length
                });
                console.log(`[LatestReleasesExtractor] Found ${elements.length} elements with selector: ${selector}`);
                break;
            }
        }
        if (!releaseElements || releaseElements.length === 0) {
            LatestReleasesExtractor.logger.warn('No latest releases found with any selector');
            return releases;
        }
        // Parse each release item
        releaseElements.each((index, element) => {
            try {
                const release = this.parseReleaseItem($, $(element), index);
                if (release) {
                    releases.push(release);
                }
            }
            catch (error) {
                LatestReleasesExtractor.logger.warn('Failed to parse release item', {
                    index,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        return releases;
    }
    /**
     * Parse individual release item from HTML element
     */
    parseReleaseItem($, element, index) {
        try {
            // Extract series title
            const titleSelectors = [
                '.title-item a',
                '.post-title h3 a',
                '.info-item a',
                '.line-2 a',
                'h3 a',
                '.title a'
            ];
            let seriesTitle = '';
            let seriesUrl = '';
            for (const selector of titleSelectors) {
                const titleElement = element.find(selector).first();
                if (titleElement.length > 0) {
                    seriesTitle = titleElement.text().trim();
                    seriesUrl = titleElement.attr('href') || '';
                    break;
                }
            }
            if (!seriesTitle) {
                LatestReleasesExtractor.logger.debug('Could not extract series title', { index });
                return null;
            }
            // Extract chapter information
            const chapterSelectors = [
                '.btn-link',
                '.chapter-item .chapter a',
                '.img-item .chapter a',
                '.chapter a',
                '.latest-chapter a'
            ];
            let chapterNumber = '';
            let chapterTitle = '';
            let chapterUrl = '';
            for (const selector of chapterSelectors) {
                const chapterElement = element.find(selector).first();
                if (chapterElement.length > 0) {
                    const chapterText = chapterElement.text().trim();
                    chapterUrl = chapterElement.attr('href') || '';
                    // Extract chapter number from text like "Chapter 123" or "Ch. 123"
                    const chapterMatch = chapterText.match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i);
                    if (chapterMatch) {
                        chapterNumber = chapterMatch[1];
                        chapterTitle = chapterText;
                    }
                    else {
                        chapterNumber = chapterText;
                        chapterTitle = chapterText;
                    }
                    break;
                }
            }
            if (!chapterNumber) {
                LatestReleasesExtractor.logger.debug('Could not extract chapter number', { index, seriesTitle });
                return null;
            }
            // Extract cover image
            const imageSelectors = ['.img-item img', 'img', '.cover img', '.thumbnail img', '.manga-thumb img'];
            let coverImageUrl = '';
            for (const selector of imageSelectors) {
                const imgElement = element.find(selector).first();
                if (imgElement.length > 0) {
                    coverImageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
                    if (coverImageUrl) {
                        // Convert relative URLs to absolute
                        coverImageUrl = this.urlManager.resolveUrl(coverImageUrl);
                        break;
                    }
                }
            }
            // Extract publish date
            const dateSelectors = ['.post-on', '.date', '.publish-date', '.updated', '.time', '.chapter-date', '.meta-date'];
            let publishDate = new Date();
            let dateFound = false;
            for (const selector of dateSelectors) {
                const dateElement = element.find(selector).first();
                if (dateElement.length > 0) {
                    const dateText = dateElement.text().trim();
                    const parsedDate = this.parseDate(dateText);
                    if (parsedDate) {
                        publishDate = parsedDate;
                        dateFound = true;
                        break;
                    }
                }
            }
            if (!dateFound) {
                // Debug log to find the real selector
                LatestReleasesExtractor.logger.warn('Date not found for release', {
                    seriesTitle,
                    htmlPreview: element.html()?.substring(0, 200) // Log snippet to identify structure
                });
            }
            // Check if this is a new release (usually indicated by a "new" badge or recent date)
            const isNew = element.find('.new, .badge-new, .recent').length > 0 ||
                (Date.now() - publishDate.getTime()) < 24 * 60 * 60 * 1000; // Less than 24 hours old
            // Generate unique ID based on series slug if possible
            // FIXED: Use deterministic ID from URL slug (manhwaz-series-slug) to match SeriesDetailsExtractor
            let id = `manhwaz-series-${seriesTitle.toLowerCase().replace(/[^a-z0-0]+/g, '-')}`; // default fallback based on title slug
            if (seriesUrl) {
                const urlParts = seriesUrl.split('/').filter(p => p.length > 0);
                const slug = urlParts[urlParts.length - 1];
                if (slug) {
                    id = `manhwaz-series-${slug}`;
                }
            }
            // Ensure URLs are absolute
            seriesUrl = this.urlManager.resolveUrl(seriesUrl);
            chapterUrl = this.urlManager.resolveUrl(chapterUrl);
            const release = {
                id,
                seriesTitle,
                chapterNumber,
                chapterTitle: chapterTitle || undefined,
                coverImageUrl: coverImageUrl || this.getPlaceholderImage(),
                publishDate,
                seriesUrl,
                chapterUrl,
                isNew
            };
            return release;
        }
        catch (error) {
            LatestReleasesExtractor.logger.warn('Error parsing release item', {
                index,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    /**
     * Parse date string into Date object
     */
    parseDate(dateText) {
        if (!dateText)
            return null;
        try {
            // Handle relative dates like "2 hours ago", "1 day ago"
            const relativeMatch = dateText.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
            if (relativeMatch) {
                const amount = parseInt(relativeMatch[1]);
                const unit = relativeMatch[2].toLowerCase();
                const now = new Date();
                switch (unit) {
                    case 'minute':
                        return new Date(now.getTime() - amount * 60 * 1000);
                    case 'hour':
                        return new Date(now.getTime() - amount * 60 * 60 * 1000);
                    case 'day':
                        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
                    case 'week':
                        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
                    case 'month':
                        return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
                }
            }
            // Handle "today", "yesterday"
            if (dateText.toLowerCase().includes('today')) {
                return new Date();
            }
            if (dateText.toLowerCase().includes('yesterday')) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday;
            }
            // Try parsing as standard date
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
            return null;
        }
        catch (error) {
            LatestReleasesExtractor.logger.debug('Failed to parse date', { dateText, error });
            return null;
        }
    }
    /**
     * Get cached data if it exists and is not expired
     */
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }
    /**
     * Set data in cache with current timestamp
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data: [...data], // Create a copy to avoid mutations
            timestamp: Date.now()
        });
    }
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        LatestReleasesExtractor.logger.info('Latest releases cache cleared');
    }
    /**
     * Get placeholder image URL
     */
    getPlaceholderImage() {
        return '/placeholder-cover.jpg'; // This should match the placeholder in public folder
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
exports.LatestReleasesExtractor = LatestReleasesExtractor;
//# sourceMappingURL=LatestReleasesExtractor.js.map