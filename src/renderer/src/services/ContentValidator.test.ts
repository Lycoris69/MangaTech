/**
 * Unit tests for ContentValidator
 * Tests data validation for scraped manhwaz.com content
 */

import { ContentValidator } from './scraper/ContentValidator'

describe('ContentValidator', () => {
  let validator: ContentValidator

  beforeEach(() => {
    validator = new ContentValidator()
  })

  describe('validateLatestRelease', () => {
    const validLatestRelease = {
      id: 'release-123',
      seriesTitle: 'Test Series',
      chapterNumber: '1',
      chapterTitle: 'First Chapter',
      coverImageUrl: 'https://manhwaz.com/images/cover.jpg',
      publishDate: new Date('2023-01-01'),
      seriesUrl: 'https://manhwaz.com/webtoon/test-series',
      chapterUrl: 'https://manhwaz.com/chapter/test-chapter',
      isNew: true
    }

    it('should validate correct latest release data', () => {
      const result = validator.validateLatestRelease(validLatestRelease)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing required fields', () => {
      const invalidData = { ...validLatestRelease }
      delete (invalidData as any).id

      const result = validator.validateLatestRelease(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('id'))).toBe(true)
    })

    it('should reject invalid URL formats', () => {
      const invalidData = {
        ...validLatestRelease,
        coverImageUrl: 'not-a-url'
      }

      const result = validator.validateLatestRelease(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('uri'))).toBe(true)
    })

    it('should handle optional fields', () => {
      const dataWithoutOptional = { ...validLatestRelease }
      delete (dataWithoutOptional as any).chapterTitle
      delete (dataWithoutOptional as any).isNew

      const result = validator.validateLatestRelease(dataWithoutOptional)
      expect(result.isValid).toBe(true)
    })

    it('should reject empty strings for required fields', () => {
      const invalidData = {
        ...validLatestRelease,
        seriesTitle: ''
      }

      const result = validator.validateLatestRelease(invalidData)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateHotScan', () => {
    const validHotScan = {
      id: 'hot-123',
      seriesTitle: 'Popular Series',
      coverImageUrl: 'https://manhwaz.com/images/hot-cover.jpg',
      rating: 8.5,
      viewCount: 10000,
      rank: 1,
      genres: ['Action', 'Adventure'],
      status: 'ongoing',
      seriesUrl: 'https://manhwaz.com/webtoon/popular-series',
      lastChapter: 'Chapter 50'
    }

    it('should validate correct hot scan data', () => {
      const result = validator.validateHotScan(validHotScan)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate status enum values', () => {
      const validStatuses = ['ongoing', 'completed', 'hiatus']

      validStatuses.forEach(status => {
        const data = { ...validHotScan, status }
        const result = validator.validateHotScan(data)
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject invalid status values', () => {
      const invalidData = {
        ...validHotScan,
        status: 'invalid-status'
      }

      const result = validator.validateHotScan(invalidData)
      expect(result.isValid).toBe(false)
    })

    it('should validate rating range', () => {
      const invalidRating = {
        ...validHotScan,
        rating: 15 // Above max of 10
      }

      const result = validator.validateHotScan(invalidRating)
      expect(result.isValid).toBe(false)
    })

    it('should handle optional numeric fields', () => {
      const dataWithoutOptional = { ...validHotScan }
      delete (dataWithoutOptional as any).rating
      delete (dataWithoutOptional as any).viewCount
      delete (dataWithoutOptional as any).rank

      const result = validator.validateHotScan(dataWithoutOptional)
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateSearchResult', () => {
    const validSearchResult = {
      id: 'search-123',
      title: 'Search Result Series',
      author: 'Test Author',
      coverImageUrl: 'https://manhwaz.com/images/search-cover.jpg',
      synopsis: 'A great series about adventures',
      genres: ['Fantasy', 'Romance'],
      status: 'ongoing',
      seriesUrl: 'https://manhwaz.com/webtoon/search-series',
      relevanceScore: 0.85
    }

    it('should validate correct search result data', () => {
      const result = validator.validateSearchResult(validSearchResult)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require core fields', () => {
      const requiredFields = ['id', 'title', 'author', 'seriesUrl']

      requiredFields.forEach(field => {
        const invalidData = { ...validSearchResult } as any
        delete invalidData[field]

        const result = validator.validateSearchResult(invalidData)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes(field))).toBe(true)
      })
    })

    it('should validate relevance score range', () => {
      const invalidScore = {
        ...validSearchResult,
        relevanceScore: 1.5 // Above max of 1
      }

      const result = validator.validateSearchResult(invalidScore)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateSeriesDetails', () => {
    const validSeriesDetails = {
      id: 'series-123',
      title: 'Detailed Series',
      alternativeTitles: ['Alt Title 1', 'Alt Title 2'],
      author: 'Series Author',
      artist: 'Series Artist',
      synopsis: 'Detailed synopsis of the series',
      coverImageUrl: 'https://manhwaz.com/images/series-cover.jpg',
      genres: ['Action', 'Drama'],
      status: 'ongoing',
      rating: 9.2,
      viewCount: 50000,
      chapters: [
        {
          id: 'chapter-1',
          chapterNumber: '1',
          title: 'First Chapter',
          publishDate: new Date('2023-01-01'),
          chapterUrl: 'https://manhwaz.com/chapter/1',
          pageCount: 20
        }
      ],
      lastUpdated: new Date('2023-12-01'),
      sourceUrl: 'https://manhwaz.com/webtoon/detailed-series'
    }

    it('should validate correct series details', () => {
      const result = validator.validateSeriesDetails(validSeriesDetails)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate nested chapter info', () => {
      const invalidChapter = {
        ...validSeriesDetails,
        chapters: [
          {
            id: 'chapter-1',
            // Missing required chapterNumber
            title: 'First Chapter',
            publishDate: new Date('2023-01-01'),
            chapterUrl: 'https://manhwaz.com/chapter/1'
          }
        ]
      }

      const result = validator.validateSeriesDetails(invalidChapter)
      expect(result.isValid).toBe(false)
    })

    it('should require chapters array', () => {
      const invalidData = { ...validSeriesDetails }
      delete (invalidData as any).chapters

      const result = validator.validateSeriesDetails(invalidData)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validatePageData', () => {
    const validPageData = {
      pageNumber: 1,
      imageUrl: 'https://manhwaz.com/images/page1.jpg',
      altText: 'Page 1 description',
      width: 800,
      height: 1200
    }

    it('should validate correct page data', () => {
      const result = validator.validatePageData(validPageData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require positive page numbers', () => {
      const invalidData = {
        ...validPageData,
        pageNumber: 0
      }

      const result = validator.validatePageData(invalidData)
      expect(result.isValid).toBe(false)
    })

    it('should handle optional dimensions', () => {
      const dataWithoutDimensions = {
        pageNumber: 1,
        imageUrl: 'https://manhwaz.com/images/page1.jpg'
      }

      const result = validator.validatePageData(dataWithoutDimensions)
      expect(result.isValid).toBe(true)
    })
  })

  describe('array validation methods', () => {
    it('should validate arrays of latest releases', () => {
      const validReleases = [
        {
          id: 'release-1',
          seriesTitle: 'Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://manhwaz.com/images/1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/webtoon/1',
          chapterUrl: 'https://manhwaz.com/chapter/1'
        },
        {
          id: 'release-2',
          seriesTitle: 'Series 2',
          chapterNumber: '2',
          coverImageUrl: 'https://manhwaz.com/images/2.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/webtoon/2',
          chapterUrl: 'https://manhwaz.com/chapter/2'
        }
      ]

      const result = validator.validateLatestReleases(validReleases)
      expect(result.isValid).toBe(true)
    })

    it('should report errors with item indices', () => {
      const invalidReleases = [
        {
          id: 'release-1',
          seriesTitle: 'Series 1',
          chapterNumber: '1',
          coverImageUrl: 'https://manhwaz.com/images/1.jpg',
          publishDate: new Date(),
          seriesUrl: 'https://manhwaz.com/webtoon/1',
          chapterUrl: 'https://manhwaz.com/chapter/1'
        },
        {
          // Missing required fields
          id: 'release-2'
        }
      ]

      const result = validator.validateLatestReleases(invalidReleases)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Item 1'))).toBe(true)
    })

    it('should handle empty arrays', () => {
      const result = validator.validateLatestReleases([])
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(warning => warning.includes('empty'))).toBe(true)
    })

    it('should reject non-arrays', () => {
      const result = validator.validateLatestReleases('not-an-array' as any)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('must be an array'))).toBe(true)
    })
  })

  describe('utility methods', () => {
    describe('isValidImageUrl', () => {
      it('should validate image URLs with extensions', () => {
        expect(validator.isValidImageUrl('https://example.com/image.jpg')).toBe(true)
        expect(validator.isValidImageUrl('https://example.com/image.png')).toBe(true)
        expect(validator.isValidImageUrl('https://example.com/image.webp')).toBe(true)
      })

      it('should validate manhwaz.com URLs without extensions', () => {
        expect(validator.isValidImageUrl('https://manhwaz.com/image/123')).toBe(true)
        expect(validator.isValidImageUrl('https://cdn.manhwaz.com/image/456')).toBe(true)
      })

      it('should reject non-image URLs', () => {
        expect(validator.isValidImageUrl('https://example.com/document.pdf')).toBe(false)
        expect(validator.isValidImageUrl('not-a-url')).toBe(false)
        expect(validator.isValidImageUrl('')).toBe(false)
      })
    })

    describe('validateCompleteness', () => {
      it('should validate complete data', () => {
        const data = {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3'
        }

        const result = validator.validateCompleteness(data, ['field1', 'field2'])
        expect(result.isValid).toBe(true)
      })

      it('should detect missing fields', () => {
        const data = {
          field1: 'value1'
        }

        const result = validator.validateCompleteness(data, ['field1', 'field2'])
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('field2'))).toBe(true)
      })

      it('should detect null/undefined values', () => {
        const data = {
          field1: 'value1',
          field2: null,
          field3: undefined
        }

        const result = validator.validateCompleteness(data, ['field1', 'field2', 'field3'])
        expect(result.isValid).toBe(false)
        expect(result.errors).toHaveLength(2)
      })

      it('should warn about empty strings', () => {
        const data = {
          field1: 'value1',
          field2: '',
          field3: '   '
        }

        const result = validator.validateCompleteness(data, ['field1', 'field2', 'field3'])
        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(2)
      })
    })
  })

  describe('validation options', () => {
    it('should handle strict validation', () => {
      const dataWithExtra = {
        id: 'test',
        seriesTitle: 'Test',
        chapterNumber: '1',
        coverImageUrl: 'https://manhwaz.com/image.jpg',
        publishDate: new Date(),
        seriesUrl: 'https://manhwaz.com/series',
        chapterUrl: 'https://manhwaz.com/chapter',
        extraField: 'should be stripped'
      }

      const result = validator.validateLatestRelease(dataWithExtra, {
        stripUnknown: true
      })

      expect(result.isValid).toBe(true)
    })

    it('should allow unknown fields when configured', () => {
      const dataWithExtra = {
        id: 'test',
        seriesTitle: 'Test',
        chapterNumber: '1',
        coverImageUrl: 'https://manhwaz.com/image.jpg',
        publishDate: new Date(),
        seriesUrl: 'https://manhwaz.com/series',
        chapterUrl: 'https://manhwaz.com/chapter',
        extraField: 'should be allowed'
      }

      const result = validator.validateLatestRelease(dataWithExtra, {
        allowUnknown: true,
        stripUnknown: false
      })

      expect(result.isValid).toBe(true)
    })
  })
})