// Example usage of the web scraping services
// This file demonstrates how to use the ScraperManager and related services

import { ScraperManager } from './ScraperManager'
import { ScrapingError } from './WebScrapingService'

// Example function showing how to use the scraper manager
export async function exampleUsage() {
  // Initialize scraper manager with custom sources
  const scraperManager = new ScraperManager([
    {
      name: 'MangaFox',
      baseUrl: 'https://mangafox.me',
      enabled: true,
      priority: 1
    },
    {
      name: 'MangaReader',
      baseUrl: 'https://mangareader.net',
      enabled: true,
      priority: 2
    }
  ])

  try {
    // Search for manga series
    console.log('Searching for "One Piece"...')
    const searchResults = await scraperManager.searchSeries('One Piece')
    console.log(`Found ${searchResults.length} results:`)
    searchResults.forEach(result => {
      console.log(`- ${result.title} by ${result.author} (${result.status})`)
    })

    // Get trending content
    console.log('\nFetching trending content...')
    const trending = await scraperManager.getTrendingContent()
    console.log(`Hot series: ${trending.hotSeries.length}`)
    console.log(`Latest releases: ${trending.latestReleases.length}`)
    console.log(`Most viewed: ${trending.mostViewed.length}`)

    // Get series details (if we have results)
    if (searchResults.length > 0) {
      const firstResult = searchResults[0]
      console.log(`\nGetting details for "${firstResult.title}"...`)
      const seriesDetails = await scraperManager.getSeriesDetails(firstResult.id)
      console.log(`Total chapters: ${seriesDetails.totalChapters}`)
      console.log(`Rating: ${seriesDetails.rating}/5`)
      console.log(`Genres: ${seriesDetails.genres.join(', ')}`)
    }

    // Validate a source
    console.log('\nValidating source...')
    const isValid = await scraperManager.validateSource('https://mangafox.me')
    console.log(`Source is valid: ${isValid}`)

  } catch (error) {
    if (error instanceof ScrapingError) {
      console.error('Scraping error:', error.message)
      if (error.sourceUrl) {
        console.error('Source URL:', error.sourceUrl)
      }
      if (error.statusCode) {
        console.error('Status code:', error.statusCode)
      }
    } else {
      console.error('Unexpected error:', error)
    }
  } finally {
    // Always cleanup resources
    await scraperManager.cleanup()
  }
}

// Example of how to handle rate limiting
export async function rateLimitingExample() {
  const scraperManager = new ScraperManager()

  try {
    // Make multiple requests - the rate limiting will automatically handle spacing
    const queries = ['Naruto', 'Bleach', 'Dragon Ball', 'Attack on Titan']
    
    console.log('Making multiple search requests with rate limiting...')
    const startTime = Date.now()
    
    const results = await Promise.all(
      queries.map(query => scraperManager.searchSeries(query))
    )
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`Completed ${queries.length} searches in ${duration}ms`)
    console.log('Rate limiting ensured proper spacing between requests')
    
    results.forEach((result, index) => {
      console.log(`${queries[index]}: ${result.length} results`)
    })

  } catch (error) {
    console.error('Error during rate limiting example:', error)
  } finally {
    await scraperManager.cleanup()
  }
}

// Example of error handling and fallback behavior
export async function errorHandlingExample() {
  const scraperManager = new ScraperManager([
    {
      name: 'WorkingSource',
      baseUrl: 'https://working-source.com',
      enabled: true,
      priority: 1
    },
    {
      name: 'FailingSource',
      baseUrl: 'https://failing-source.com',
      enabled: true,
      priority: 2
    }
  ])

  try {
    // This will demonstrate fallback behavior when some sources fail
    console.log('Testing error handling and fallback behavior...')
    
    const results = await scraperManager.searchSeries('test query')
    console.log(`Got ${results.length} results despite some sources failing`)
    
  } catch (error) {
    if (error instanceof ScrapingError) {
      console.log('All sources failed, but error was handled gracefully')
      console.log('Error message:', error.message)
    }
  } finally {
    await scraperManager.cleanup()
  }
}

// Export the examples for use in other parts of the application
export const WebScrapingExamples = {
  basicUsage: exampleUsage,
  rateLimiting: rateLimitingExample,
  errorHandling: errorHandlingExample
}