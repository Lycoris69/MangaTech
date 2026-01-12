/**
 * Example usage of the SearchInterface functionality
 * 
 * This file demonstrates how to use the manhwaz.com search functionality
 * implemented in task 5. It shows the main features:
 * - Basic search with results
 * - Search with options and filters
 * - Autocomplete suggestions
 * - Empty result handling
 */

import { ManhwazScraper } from './ManhwazScraper'
import { SearchOptions } from './SearchInterface'

export class SearchExample {
  private scraper: ManhwazScraper

  constructor() {
    this.scraper = new ManhwazScraper()
  }

  /**
   * Example 1: Basic search functionality
   * Requirement 3.2: Query manhwaz.com and return relevant manga results
   */
  async basicSearch(query: string) {
    console.log(`Searching for: "${query}"`)

    try {
      // Simple search that returns just the results array
      const results = await this.scraper.searchSeries(query)

      console.log(`Found ${results.length} results:`)
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} by ${result.author}`)
        console.log(`   Status: ${result.status}, Rating: ${result.rating}`)
        console.log(`   Genres: ${result.genres.join(', ')}`)
        console.log(`   URL: ${result.sourceUrl}`)
        console.log()
      })

      return results
    } catch (error) {
      console.error('Search failed:', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }

  /**
   * Example 2: Advanced search with detailed response
   * Requirement 3.3: Show series titles, cover images, authors, and brief descriptions
   */
  async advancedSearch(query: string, options?: SearchOptions) {
    console.log(`Advanced search for: "${query}"`)
    if (options) {
      console.log('Options:', JSON.stringify(options, null, 2))
    }

    try {
      // Detailed search that returns full SearchResponse
      const response = await this.scraper.searchSeriesWithDetails(query, options)

      console.log(`Query: "${response.query}"`)
      console.log(`Total results: ${response.totalCount}`)
      console.log(`Has more: ${response.hasMore}`)
      console.log(`Returned: ${response.results.length} results`)

      // Display results with full metadata
      response.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title}`)
        console.log(`   Author: ${result.author}`)
        console.log(`   Status: ${result.status}`)
        console.log(`   Rating: ${result.rating}/10`)
        console.log(`   Genres: ${result.genres.join(', ')}`)
        console.log(`   Cover: ${result.coverImageUrl}`)
        console.log(`   Synopsis: ${result.synopsis.substring(0, 100)}${result.synopsis.length > 100 ? '...' : ''}`)
        console.log(`   URL: ${result.sourceUrl}`)
      })

      // Display suggestions if available
      if (response.suggestions.length > 0) {
        console.log('\nSuggestions:')
        response.suggestions.forEach(suggestion => {
          console.log(`- ${suggestion.suggestion} (${suggestion.type})`)
        })
      }

      return response
    } catch (error) {
      console.error('Advanced search failed:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  /**
   * Example 3: Autocomplete functionality
   * Requirement 3.5: Provide autocomplete suggestions based on manhwaz.com search data
   */
  async getSearchSuggestions(partialQuery: string) {
    console.log(`Getting suggestions for: "${partialQuery}"`)

    try {
      const suggestions = await this.scraper.getAutocompleteSuggestions(partialQuery)

      if (suggestions.length > 0) {
        console.log('Suggestions:')
        suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion.suggestion} (${suggestion.type})`)
        })
      } else {
        console.log('No suggestions available')
      }

      return suggestions
    } catch (error) {
      console.error('Failed to get suggestions:', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }

  /**
   * Example 4: Search with filters and sorting
   * Demonstrates the SearchOptions functionality
   */
  async filteredSearch(query: string) {
    console.log(`Filtered search for: "${query}"`)

    const options: SearchOptions = {
      limit: 5,
      sortBy: 'rating',
      filterBy: {
        genres: ['action', 'adventure'],
        status: 'ongoing',
        minRating: 7.0
      }
    }

    return await this.advancedSearch(query, options)
  }

  /**
   * Example 5: Handle empty results
   * Requirement 3.4: Display appropriate messaging and suggest alternative searches
   */
  async handleEmptyResults(query: string) {
    console.log(`Searching for potentially empty results: "${query}"`)

    try {
      const response = await this.scraper.searchSeriesWithDetails(query)

      if (response.results.length === 0) {
        // Use the SearchInterface to generate appropriate empty results message
        const searchInterface = this.scraper.getSearchInterface()
        const message = searchInterface.generateEmptyResultsMessage(query, response.suggestions)

        console.log('Empty results message:')
        console.log(message)

        return { isEmpty: true, message, suggestions: response.suggestions }
      } else {
        console.log(`Found ${response.results.length} results`)
        return { isEmpty: false, results: response.results }
      }
    } catch (error) {
      console.error('Search failed:', error instanceof Error ? error.message : 'Unknown error')
      return { isEmpty: true, message: 'Search failed due to an error', suggestions: [] }
    }
  }

  /**
   * Example 6: Complete search workflow
   * Demonstrates a typical user search workflow
   */
  async completeSearchWorkflow(userInput: string) {
    console.log('=== Complete Search Workflow ===')
    console.log(`User input: "${userInput}"`)

    // Step 1: Get autocomplete suggestions as user types
    if (userInput.length >= 2) {
      console.log('\n1. Autocomplete suggestions:')
      await this.getSearchSuggestions(userInput)
    }

    // Step 2: Perform the actual search
    console.log('\n2. Search results:')
    const response = await this.advancedSearch(userInput, { limit: 10 })

    if (!response || response.results.length === 0) {
      // Step 3: Handle empty results
      console.log('\n3. Handling empty results:')
      await this.handleEmptyResults(userInput)
    } else {
      console.log(`\n3. Search completed successfully with ${response.results.length} results`)
    }

    return response
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.scraper.cleanup()
  }
}

// Example usage (commented out to avoid execution during import)
/*
async function runExamples() {
  const searchExample = new SearchExample()
  
  try {
    // Basic search
    await searchExample.basicSearch('naruto')
    
    // Advanced search with options
    await searchExample.filteredSearch('action manga')
    
    // Autocomplete
    await searchExample.getSearchSuggestions('one pi')
    
    // Empty results handling
    await searchExample.handleEmptyResults('nonexistentmanga12345')
    
    // Complete workflow
    await searchExample.completeSearchWorkflow('solo leveling')
    
  } finally {
    await searchExample.cleanup()
  }
}

// Uncomment to run examples
// runExamples().catch(console.error)
*/