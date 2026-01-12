"use strict";
/**
 * ContentValidator - Validates scraped data for completeness and accuracy
 *
 * Provides comprehensive validation for all types of content scraped from
 * manhwaz.com, ensuring data integrity and completeness before processing.
 *
 * Requirements: 4.4
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentValidator = void 0;
const joi_1 = __importDefault(require("joi"));
// Validation schemas for different content types
const latestReleaseSchema = joi_1.default.object({
    id: joi_1.default.string().required().min(1),
    seriesTitle: joi_1.default.string().required().min(1),
    chapterNumber: joi_1.default.string().required().min(1),
    chapterTitle: joi_1.default.string().optional().allow(''),
    coverImageUrl: joi_1.default.string().uri().required(),
    publishDate: joi_1.default.date().required(),
    seriesUrl: joi_1.default.string().uri().required(),
    chapterUrl: joi_1.default.string().uri().required(),
    isNew: joi_1.default.boolean().optional().default(false)
});
const hotScanSchema = joi_1.default.object({
    id: joi_1.default.string().required().min(1),
    seriesTitle: joi_1.default.string().required().min(1),
    coverImageUrl: joi_1.default.string().uri().required(),
    rating: joi_1.default.number().min(0).max(10).optional(),
    viewCount: joi_1.default.number().min(0).optional(),
    rank: joi_1.default.number().min(1).optional(),
    genres: joi_1.default.array().items(joi_1.default.string().min(1)).optional().default([]),
    status: joi_1.default.string().valid('ongoing', 'completed', 'hiatus').required(),
    seriesUrl: joi_1.default.string().uri().required(),
    lastChapter: joi_1.default.string().optional().allow('')
});
const searchResultSchema = joi_1.default.object({
    id: joi_1.default.string().required().min(1),
    title: joi_1.default.string().required().min(1),
    author: joi_1.default.string().required().min(1),
    coverImageUrl: joi_1.default.string().uri().optional(),
    synopsis: joi_1.default.string().optional().allow(''),
    genres: joi_1.default.array().items(joi_1.default.string().min(1)).optional().default([]),
    status: joi_1.default.string().optional().allow(''),
    seriesUrl: joi_1.default.string().uri().required(),
    relevanceScore: joi_1.default.number().min(0).max(1).optional()
});
const chapterInfoSchema = joi_1.default.object({
    id: joi_1.default.string().required().min(1),
    chapterNumber: joi_1.default.string().required().min(1),
    title: joi_1.default.string().optional().allow(''),
    publishDate: joi_1.default.date().required(),
    chapterUrl: joi_1.default.string().uri().required(),
    pageCount: joi_1.default.number().min(0).optional()
});
const seriesDetailsSchema = joi_1.default.object({
    id: joi_1.default.string().required().min(1),
    title: joi_1.default.string().required().min(1),
    alternativeTitles: joi_1.default.array().items(joi_1.default.string().min(1)).optional().default([]),
    author: joi_1.default.string().required().min(1),
    artist: joi_1.default.string().optional().allow(''),
    synopsis: joi_1.default.string().optional().allow(''),
    coverImageUrl: joi_1.default.string().uri().optional(),
    genres: joi_1.default.array().items(joi_1.default.string().min(1)).optional().default([]),
    status: joi_1.default.string().valid('ongoing', 'completed', 'hiatus').required(),
    rating: joi_1.default.number().min(0).max(10).optional(),
    viewCount: joi_1.default.number().min(0).optional(),
    chapters: joi_1.default.array().items(chapterInfoSchema).required(),
    lastUpdated: joi_1.default.date().required(),
    sourceUrl: joi_1.default.string().uri().required()
});
const pageDataSchema = joi_1.default.object({
    pageNumber: joi_1.default.number().min(1).required(),
    imageUrl: joi_1.default.string().uri().required(),
    altText: joi_1.default.string().optional().allow(''),
    width: joi_1.default.number().min(1).optional(),
    height: joi_1.default.number().min(1).optional()
});
/**
 * Content validator for scraped manhwaz.com data
 */
class ContentValidator {
    constructor() {
        this.defaultOptions = {
            strict: true,
            allowUnknown: false,
            stripUnknown: true
        };
    }
    /**
     * Validates latest release data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateLatestRelease(data, options) {
        return this.validateWithSchema(data, latestReleaseSchema, 'LatestRelease', options);
    }
    /**
     * Validates hot scan data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateHotScan(data, options) {
        return this.validateWithSchema(data, hotScanSchema, 'HotScan', options);
    }
    /**
     * Validates search result data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateSearchResult(data, options) {
        return this.validateWithSchema(data, searchResultSchema, 'SearchResult', options);
    }
    /**
     * Validates series details data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateSeriesDetails(data, options) {
        return this.validateWithSchema(data, seriesDetailsSchema, 'SeriesDetails', options);
    }
    /**
     * Validates chapter info data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateChapterInfo(data, options) {
        return this.validateWithSchema(data, chapterInfoSchema, 'ChapterInfo', options);
    }
    /**
     * Validates page data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validatePageData(data, options) {
        return this.validateWithSchema(data, pageDataSchema, 'PageData', options);
    }
    /**
     * Validates an array of latest releases
     * @param data - Array of latest releases
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateLatestReleases(data, options) {
        return this.validateArray(data, (item, index) => this.validateLatestRelease(item, options), 'LatestReleases');
    }
    /**
     * Validates an array of hot scans
     * @param data - Array of hot scans
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateHotScans(data, options) {
        return this.validateArray(data, (item, index) => this.validateHotScan(item, options), 'HotScans');
    }
    /**
     * Validates an array of search results
     * @param data - Array of search results
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateSearchResults(data, options) {
        return this.validateArray(data, (item, index) => this.validateSearchResult(item, options), 'SearchResults');
    }
    /**
     * Validates an array of page data
     * @param data - Array of page data
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validatePageDataArray(data, options) {
        return this.validateArray(data, (item, index) => this.validatePageData(item, options), 'PageDataArray');
    }
    /**
     * Checks if a URL is a valid manhwaz.com image URL
     * @param url - URL to validate
     * @returns true if valid image URL
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        try {
            const parsedUrl = new URL(url);
            // Check if it's a valid image extension
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const hasImageExtension = imageExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext));
            // Allow URLs without extensions if they're from manhwaz.com or common CDNs
            const trustedDomains = ['manhwaz.com', 'www.manhwaz.com', 'cdn.manhwaz.com'];
            const isTrustedDomain = trustedDomains.some(domain => parsedUrl.hostname.includes(domain));
            return hasImageExtension || isTrustedDomain;
        }
        catch {
            return false;
        }
    }
    /**
     * Validates data completeness (checks for required fields)
     * @param data - Data object to check
     * @param requiredFields - Array of required field names
     * @returns Validation result
     */
    validateCompleteness(data, requiredFields) {
        const errors = [];
        const warnings = [];
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return { isValid: false, errors, warnings };
        }
        for (const field of requiredFields) {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
            else if (data[field] === null || data[field] === undefined) {
                errors.push(`Field '${field}' cannot be null or undefined`);
            }
            else if (typeof data[field] === 'string' && data[field].trim() === '') {
                warnings.push(`Field '${field}' is empty`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Generic validation using Joi schema
     */
    validateWithSchema(data, schema, typeName, options) {
        const opts = { ...this.defaultOptions, ...options };
        const { error, warning, value } = schema.validate(data, {
            allowUnknown: opts.allowUnknown,
            stripUnknown: opts.stripUnknown,
            abortEarly: false
        });
        const errors = [];
        const warnings = [];
        if (error) {
            errors.push(...error.details.map(detail => `${typeName} validation error: ${detail.message}`));
        }
        if (warning) {
            warnings.push(...warning.details.map(detail => `${typeName} validation warning: ${detail.message}`));
        }
        return {
            isValid: !error,
            errors,
            warnings
        };
    }
    /**
     * Validates an array of items using a validator function
     */
    validateArray(data, validator, typeName) {
        const errors = [];
        const warnings = [];
        if (!Array.isArray(data)) {
            errors.push(`${typeName} must be an array`);
            return { isValid: false, errors, warnings };
        }
        if (data.length === 0) {
            warnings.push(`${typeName} array is empty`);
        }
        data.forEach((item, index) => {
            const result = validator(item, index);
            if (!result.isValid) {
                errors.push(...result.errors.map(error => `Item ${index}: ${error}`));
            }
            warnings.push(...result.warnings.map(warning => `Item ${index}: ${warning}`));
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}
exports.ContentValidator = ContentValidator;
//# sourceMappingURL=ContentValidator.js.map