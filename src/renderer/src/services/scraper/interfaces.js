"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.RateLimitError = exports.ScrapingError = void 0;
// Error types for web scraping
class ScrapingError extends Error {
    constructor(message, sourceUrl, statusCode) {
        super(message);
        this.sourceUrl = sourceUrl;
        this.statusCode = statusCode;
        this.name = 'ScrapingError';
    }
}
exports.ScrapingError = ScrapingError;
class RateLimitError extends ScrapingError {
    constructor(message, sourceUrl) {
        super(message, sourceUrl);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class ValidationError extends ScrapingError {
    constructor(message, sourceUrl) {
        super(message, sourceUrl);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=interfaces.js.map