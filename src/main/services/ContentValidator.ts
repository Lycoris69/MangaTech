/**
 * ContentValidator - Validates scraped data for completeness and accuracy
 * 
 * Provides comprehensive validation for all types of content scraped from
 * manhwaz.com, ensuring data integrity and completeness before processing.
 * 
 * Requirements: 4.4
 */

import Joi from 'joi'

// Validation schemas for different content types
const latestReleaseSchema = Joi.object({
  id: Joi.string().required().min(1),
  seriesTitle: Joi.string().required().min(1),
  chapterNumber: Joi.string().required().min(1),
  chapterTitle: Joi.string().optional().allow(''),
  coverImageUrl: Joi.string().uri().required(),
  publishDate: Joi.date().required(),
  seriesUrl: Joi.string().uri().required(),
  chapterUrl: Joi.string().uri().required(),
  isNew: Joi.boolean().optional().default(false)
})

const hotScanSchema = Joi.object({
  id: Joi.string().required().min(1),
  seriesTitle: Joi.string().required().min(1),
  coverImageUrl: Joi.string().uri().required(),
  rating: Joi.number().min(0).max(10).optional(),
  viewCount: Joi.number().min(0).optional(),
  rank: Joi.number().min(1).optional(),
  genres: Joi.array().items(Joi.string().min(1)).optional().default([]),
  status: Joi.string().valid('ongoing', 'completed', 'hiatus').required(),
  seriesUrl: Joi.string().uri().required(),
  lastChapter: Joi.string().optional().allow('')
})

const searchResultSchema = Joi.object({
  id: Joi.string().required().min(1),
  title: Joi.string().required().min(1),
  author: Joi.string().required().min(1),
  coverImageUrl: Joi.string().uri().optional(),
  synopsis: Joi.string().optional().allow(''),
  genres: Joi.array().items(Joi.string().min(1)).optional().default([]),
  status: Joi.string().optional().allow(''),
  seriesUrl: Joi.string().uri().required(),
  relevanceScore: Joi.number().min(0).max(1).optional()
})

const chapterInfoSchema = Joi.object({
  id: Joi.string().required().min(1),
  chapterNumber: Joi.string().required().min(1),
  title: Joi.string().optional().allow(''),
  publishDate: Joi.date().required(),
  chapterUrl: Joi.string().uri().required(),
  pageCount: Joi.number().min(0).optional()
})

const seriesDetailsSchema = Joi.object({
  id: Joi.string().required().min(1),
  title: Joi.string().required().min(1),
  alternativeTitles: Joi.array().items(Joi.string().min(1)).optional().default([]),
  author: Joi.string().required().min(1),
  artist: Joi.string().optional().allow(''),
  synopsis: Joi.string().optional().allow(''),
  coverImageUrl: Joi.string().uri().optional(),
  genres: Joi.array().items(Joi.string().min(1)).optional().default([]),
  status: Joi.string().valid('ongoing', 'completed', 'hiatus').required(),
  rating: Joi.number().min(0).max(10).optional(),
  viewCount: Joi.number().min(0).optional(),
  chapters: Joi.array().items(chapterInfoSchema).required(),
  lastUpdated: Joi.date().required(),
  sourceUrl: Joi.string().uri().required()
})

const pageDataSchema = Joi.object({
  pageNumber: Joi.number().min(1).required(),
  imageUrl: Joi.string().uri().required(),
  altText: Joi.string().optional().allow(''),
  width: Joi.number().min(1).optional(),
  height: Joi.number().min(1).optional()
})

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ValidationOptions {
  strict?: boolean
  allowUnknown?: boolean
  stripUnknown?: boolean
}

/**
 * Content validator for scraped manhwaz.com data
 */
export class ContentValidator {
  private defaultOptions: ValidationOptions = {
    strict: true,
    allowUnknown: false,
    stripUnknown: true
  }

  /**
   * Validates latest release data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateLatestRelease(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, latestReleaseSchema, 'LatestRelease', options)
  }

  /**
   * Validates hot scan data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateHotScan(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, hotScanSchema, 'HotScan', options)
  }

  /**
   * Validates search result data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateSearchResult(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, searchResultSchema, 'SearchResult', options)
  }

  /**
   * Validates series details data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateSeriesDetails(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, seriesDetailsSchema, 'SeriesDetails', options)
  }

  /**
   * Validates chapter info data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateChapterInfo(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, chapterInfoSchema, 'ChapterInfo', options)
  }

  /**
   * Validates page data
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validatePageData(data: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateWithSchema(data, pageDataSchema, 'PageData', options)
  }

  /**
   * Validates an array of latest releases
   * @param data - Array of latest releases
   * @param options - Validation options
   * @returns Validation result with details for each item
   */
  validateLatestReleases(data: unknown[], options?: ValidationOptions): ValidationResult {
    return this.validateArray(data, (item) =>
      this.validateLatestRelease(item, options), 'LatestReleases')
  }

  /**
   * Validates an array of hot scans
   * @param data - Array of hot scans
   * @param options - Validation options
   * @returns Validation result with details for each item
   */
  validateHotScans(data: unknown[], options?: ValidationOptions): ValidationResult {
    return this.validateArray(data, (item) =>
      this.validateHotScan(item, options), 'HotScans')
  }

  /**
   * Validates an array of search results
   * @param data - Array of search results
   * @param options - Validation options
   * @returns Validation result with details for each item
   */
  validateSearchResults(data: unknown[], options?: ValidationOptions): ValidationResult {
    return this.validateArray(data, (item) =>
      this.validateSearchResult(item, options), 'SearchResults')
  }

  /**
   * Validates an array of page data
   * @param data - Array of page data
   * @param options - Validation options
   * @returns Validation result with details for each item
   */
  validatePageDataArray(data: unknown[], options?: ValidationOptions): ValidationResult {
    return this.validateArray(data, (item) =>
      this.validatePageData(item, options), 'PageDataArray')
  }

  /**
   * Checks if a URL is a valid manhwaz.com image URL
   * @param url - URL to validate
   * @returns true if valid image URL
   */
  isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const parsedUrl = new URL(url)

      // Check if it's a valid image extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      const hasImageExtension = imageExtensions.some(ext =>
        parsedUrl.pathname.toLowerCase().endsWith(ext))

      // Allow URLs without extensions if they're from manhwaz.com or common CDNs
      const trustedDomains = ['manhwaz.com', 'www.manhwaz.com', 'cdn.manhwaz.com']
      const isTrustedDomain = trustedDomains.some(domain =>
        parsedUrl.hostname.includes(domain))

      return hasImageExtension || isTrustedDomain
    } catch {
      return false
    }
  }

  /**
   * Validates data completeness (checks for required fields)
   * @param data - Data object to check
   * @param requiredFields - Array of required field names
   * @returns Validation result
   */
  validateCompleteness(data: unknown, requiredFields: string[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object')
      return { isValid: false, errors, warnings }
    }

    for (const field of requiredFields) {
      if (!(field in (data as Record<string, unknown>))) {
        errors.push(`Missing required field: ${field}`)
      } else if ((data as Record<string, unknown>)[field] === null || (data as Record<string, unknown>)[field] === undefined) {
        errors.push(`Field '${field}' cannot be null or undefined`)
      } else if (typeof (data as Record<string, unknown>)[field] === 'string' && ((data as Record<string, unknown>)[field] as string).trim() === '') {
        warnings.push(`Field '${field}' is empty`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Generic validation using Joi schema
   */
  private validateWithSchema(
    data: unknown,
    schema: Joi.ObjectSchema,
    typeName: string,
    options?: ValidationOptions
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options }

    const { error, warning } = schema.validate(data, {
      allowUnknown: opts.allowUnknown,
      stripUnknown: opts.stripUnknown,
      abortEarly: false
    })

    const errors: string[] = []
    const warnings: string[] = []

    if (error) {
      errors.push(...error.details.map(detail =>
        `${typeName} validation error: ${detail.message}`))
    }

    if (warning) {
      warnings.push(...warning.details.map(detail =>
        `${typeName} validation warning: ${detail.message}`))
    }

    return {
      isValid: !error,
      errors,
      warnings
    }
  }

  /**
   * Validates an array of items using a validator function
   */
  private validateArray<T>(
    data: T[],
    validator: (item: T, index: number) => ValidationResult,
    typeName: string
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(data)) {
      errors.push(`${typeName} must be an array`)
      return { isValid: false, errors, warnings }
    }

    if (data.length === 0) {
      warnings.push(`${typeName} array is empty`)
    }

    data.forEach((item, index) => {
      const result = validator(item, index)

      if (!result.isValid) {
        errors.push(...result.errors.map(error =>
          `Item ${index}: ${error}`))
      }

      warnings.push(...result.warnings.map(warning =>
        `Item ${index}: ${warning}`))
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}