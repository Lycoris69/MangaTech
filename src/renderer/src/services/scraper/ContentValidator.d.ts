/**
 * ContentValidator - Validates scraped data for completeness and accuracy
 *
 * Provides comprehensive validation for all types of content scraped from
 * manhwaz.com, ensuring data integrity and completeness before processing.
 *
 * Requirements: 4.4
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface ValidationOptions {
    strict?: boolean;
    allowUnknown?: boolean;
    stripUnknown?: boolean;
}
/**
 * Content validator for scraped manhwaz.com data
 */
export declare class ContentValidator {
    private defaultOptions;
    /**
     * Validates latest release data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateLatestRelease(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates hot scan data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateHotScan(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates search result data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateSearchResult(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates series details data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateSeriesDetails(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates chapter info data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateChapterInfo(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates page data
     * @param data - Data to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validatePageData(data: any, options?: ValidationOptions): ValidationResult;
    /**
     * Validates an array of latest releases
     * @param data - Array of latest releases
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateLatestReleases(data: any[], options?: ValidationOptions): ValidationResult;
    /**
     * Validates an array of hot scans
     * @param data - Array of hot scans
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateHotScans(data: any[], options?: ValidationOptions): ValidationResult;
    /**
     * Validates an array of search results
     * @param data - Array of search results
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validateSearchResults(data: any[], options?: ValidationOptions): ValidationResult;
    /**
     * Validates an array of page data
     * @param data - Array of page data
     * @param options - Validation options
     * @returns Validation result with details for each item
     */
    validatePageDataArray(data: any[], options?: ValidationOptions): ValidationResult;
    /**
     * Checks if a URL is a valid manhwaz.com image URL
     * @param url - URL to validate
     * @returns true if valid image URL
     */
    isValidImageUrl(url: string): boolean;
    /**
     * Validates data completeness (checks for required fields)
     * @param data - Data object to check
     * @param requiredFields - Array of required field names
     * @returns Validation result
     */
    validateCompleteness(data: any, requiredFields: string[]): ValidationResult;
    /**
     * Generic validation using Joi schema
     */
    private validateWithSchema;
    /**
     * Validates an array of items using a validator function
     */
    private validateArray;
}
//# sourceMappingURL=ContentValidator.d.ts.map