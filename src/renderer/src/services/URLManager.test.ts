/**
 * Unit tests for URLManager
 * Tests URL validation and construction for manhwaz.com
 */

import { URLManager } from './URLManager'

describe('URLManager', () => {
  let urlManager: URLManager

  beforeEach(() => {
    urlManager = new URLManager()
  })

  describe('validateUrl', () => {
    it('should validate manhwaz.com URLs', () => {
      expect(urlManager.validateUrl('https://manhwaz.com')).toBe(true)
      expect(urlManager.validateUrl('https://www.manhwaz.com')).toBe(true)
      expect(urlManager.validateUrl('https://manhwaz.com/webtoon/series-1')).toBe(true)
      expect(urlManager.validateUrl('https://www.manhwaz.com/chapter/chapter-1')).toBe(true)
    })

    it('should reject non-manhwaz.com URLs', () => {
      expect(urlManager.validateUrl('https://google.com')).toBe(false)
      expect(urlManager.validateUrl('https://other-site.com')).toBe(false)
      expect(urlManager.validateUrl('https://fake-manhwaz.com')).toBe(false)
    })

    it('should reject invalid URLs', () => {
      expect(urlManager.validateUrl('not-a-url')).toBe(false)
      expect(urlManager.validateUrl('')).toBe(false)
      expect(urlManager.validateUrl('ftp://manhwaz.com')).toBe(false)
    })

    it('should handle null and undefined inputs', () => {
      expect(urlManager.validateUrl(null as any)).toBe(false)
      expect(urlManager.validateUrl(undefined as any)).toBe(false)
    })
  })

  describe('buildSearchUrl', () => {
    it('should build valid search URLs', () => {
      const url = urlManager.buildSearchUrl('test query')
      expect(url).toBe('https://manhwaz.com/search?s=test%20query')
    })

    it('should encode special characters', () => {
      const url = urlManager.buildSearchUrl('test & query')
      expect(url).toBe('https://manhwaz.com/search?s=test%20%26%20query')
    })

    it('should handle empty queries', () => {
      expect(() => urlManager.buildSearchUrl('')).toThrow('Search query must be a non-empty string')
      expect(() => urlManager.buildSearchUrl('   ')).toThrow('Search query must be a non-empty string')
    })

    it('should handle null and undefined queries', () => {
      expect(() => urlManager.buildSearchUrl(null as any)).toThrow('Search query must be a non-empty string')
      expect(() => urlManager.buildSearchUrl(undefined as any)).toThrow('Search query must be a non-empty string')
    })
  })

  describe('buildSeriesUrl', () => {
    it('should build series URLs from IDs', () => {
      const url = urlManager.buildSeriesUrl('series-123')
      expect(url).toBe('https://manhwaz.com/webtoon/series-123')
    })

    it('should handle full URLs', () => {
      const fullUrl = 'https://manhwaz.com/webtoon/existing-series'
      const url = urlManager.buildSeriesUrl(fullUrl)
      expect(url).toBe(fullUrl)
    })

    it('should validate full URLs', () => {
      expect(() => urlManager.buildSeriesUrl('https://other-site.com/series')).toThrow('Invalid manhwaz.com URL provided')
    })

    it('should clean up series IDs', () => {
      const url = urlManager.buildSeriesUrl('/series-123/')
      expect(url).toBe('https://manhwaz.com/webtoon/series-123')
    })

    it('should handle empty series IDs', () => {
      expect(() => urlManager.buildSeriesUrl('')).toThrow('Series ID must be a non-empty string')
      expect(() => urlManager.buildSeriesUrl('   ')).toThrow('Series ID must be a non-empty string')
    })
  })

  describe('buildChapterUrl', () => {
    it('should build chapter URLs from IDs', () => {
      const url = urlManager.buildChapterUrl('chapter-456')
      expect(url).toBe('https://manhwaz.com/chapter/chapter-456')
    })

    it('should handle full URLs', () => {
      const fullUrl = 'https://manhwaz.com/chapter/existing-chapter'
      const url = urlManager.buildChapterUrl(fullUrl)
      expect(url).toBe(fullUrl)
    })

    it('should validate full URLs', () => {
      expect(() => urlManager.buildChapterUrl('https://other-site.com/chapter')).toThrow('Invalid manhwaz.com URL provided')
    })

    it('should clean up chapter IDs', () => {
      const url = urlManager.buildChapterUrl('/chapter-456/')
      expect(url).toBe('https://manhwaz.com/chapter/chapter-456')
    })

    it('should handle empty chapter IDs', () => {
      expect(() => urlManager.buildChapterUrl('')).toThrow('Chapter ID must be a non-empty string')
      expect(() => urlManager.buildChapterUrl('   ')).toThrow('Chapter ID must be a non-empty string')
    })
  })

  describe('getBaseUrl', () => {
    it('should return the correct base URL', () => {
      expect(urlManager.getBaseUrl()).toBe('https://manhwaz.com')
    })
  })

  describe('extractSeriesId', () => {
    it('should extract series ID from valid URLs', () => {
      expect(urlManager.extractSeriesId('https://manhwaz.com/webtoon/series-123')).toBe('series-123')
      expect(urlManager.extractSeriesId('https://www.manhwaz.com/webtoon/another-series')).toBe('another-series')
    })

    it('should return null for invalid URLs', () => {
      expect(urlManager.extractSeriesId('https://other-site.com/webtoon/series')).toBeNull()
      expect(urlManager.extractSeriesId('https://manhwaz.com/chapter/chapter-1')).toBeNull()
      expect(urlManager.extractSeriesId('not-a-url')).toBeNull()
    })
  })

  describe('extractChapterId', () => {
    it('should extract chapter ID from valid URLs', () => {
      expect(urlManager.extractChapterId('https://manhwaz.com/chapter/chapter-456')).toBe('chapter-456')
      expect(urlManager.extractChapterId('https://www.manhwaz.com/chapter/another-chapter')).toBe('another-chapter')
    })

    it('should return null for invalid URLs', () => {
      expect(urlManager.extractChapterId('https://other-site.com/chapter/chapter')).toBeNull()
      expect(urlManager.extractChapterId('https://manhwaz.com/webtoon/series-1')).toBeNull()
      expect(urlManager.extractChapterId('not-a-url')).toBeNull()
    })
  })

  describe('resolveUrl', () => {
    it('should return absolute URLs as-is', () => {
      expect(urlManager.resolveUrl('https://manhwaz.com/series/test')).toBe('https://manhwaz.com/series/test')
      expect(urlManager.resolveUrl('http://example.com/test')).toBe('http://example.com/test')
    })

    it('should handle protocol-relative URLs', () => {
      expect(urlManager.resolveUrl('//manhwaz.com/series/test')).toBe('https://manhwaz.com/series/test')
    })

    it('should resolve absolute paths', () => {
      expect(urlManager.resolveUrl('/series/test')).toBe('https://manhwaz.com/series/test')
      expect(urlManager.resolveUrl('/chapter/123')).toBe('https://manhwaz.com/chapter/123')
    })

    it('should resolve relative paths', () => {
      expect(urlManager.resolveUrl('series/test')).toBe('https://manhwaz.com/series/test')
      expect(urlManager.resolveUrl('images/cover.jpg')).toBe('https://manhwaz.com/images/cover.jpg')
    })

    it('should handle empty or invalid inputs', () => {
      expect(urlManager.resolveUrl('')).toBe('')
      expect(urlManager.resolveUrl(null as any)).toBe('')
      expect(urlManager.resolveUrl(undefined as any)).toBe('')
    })
  })
})