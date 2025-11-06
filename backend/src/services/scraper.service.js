/**
 * Scraper Service
 * 
 * Service pour scraper les sites de manga (manhwa.com principalement)
 * Extrait les URLs des images de chapitres et métadonnées
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class ScraperService {
  constructor() {
    this.browserConfig = {
      headless: 'new',
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser', // Chrome du système
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
  }

  /**
   * Scrape un chapitre complet et retourne les URLs des images
   * @param {string} chapterUrl - URL du chapitre à scraper
   * @returns {Promise<Array<{pageNumber: number, imageUrl: string, width?: number, height?: number}>>}
   */
  async scrapeChapter(chapterUrl) {
    console.log(`🔍 Scraping chapter: ${chapterUrl}`);
    
    let browser;
    try {
      browser = await puppeteer.launch(this.browserConfig);
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      // Navigate to chapter
      await page.goto(chapterUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Wait for images to load
      await page.waitForSelector('img', { timeout: 10000 });
      
      // Extract image URLs - ADAPTER SELON LA STRUCTURE DU SITE
      const images = await page.evaluate(() => {
        // Sélecteurs possibles (à tester et adapter)
        const selectors = [
          '.reading-content img',
          '.page-break img',
          '#readerarea img',
          '.chapter-content img',
          'img[data-src]',
          'img.wp-manga-chapter-img'
        ];
        
        let imageElements = [];
        for (const selector of selectors) {
          imageElements = document.querySelectorAll(selector);
          if (imageElements.length > 0) break;
        }
        
        return Array.from(imageElements).map((img, index) => ({
          pageNumber: index + 1,
          imageUrl: img.src || img.dataset.src || img.getAttribute('data-lazy-src'),
          width: img.naturalWidth || null,
          height: img.naturalHeight || null
        })).filter(img => img.imageUrl && !img.imageUrl.includes('logo') && !img.imageUrl.includes('banner'));
      });
      
      console.log(`✅ Found ${images.length} pages`);
      return images;
      
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw new Error(`Failed to scrape chapter: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Scrape les métadonnées d'un manga (titre, cover, description)
   * @param {string} mangaUrl - URL de la page du manga
   * @returns {Promise<{title: string, coverUrl: string, description: string, status: string}>}
   */
  async scrapeMangaMetadata(mangaUrl) {
    console.log(`🔍 Scraping manga metadata: ${mangaUrl}`);
    
    try {
      const response = await axios.get(mangaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // ADAPTER SELON LA STRUCTURE DU SITE
      const title = $('h1.entry-title').text().trim() || 
                    $('.post-title h1').text().trim() ||
                    $('h1').first().text().trim();
      
      const coverUrl = $('.summary_image img').attr('src') ||
                       $('.manga-cover img').attr('src') ||
                       $('img[class*="cover"]').first().attr('src');
      
      const description = $('.summary__content p').text().trim() ||
                         $('.description-summary p').text().trim() ||
                         $('.manga-excerpt').text().trim();
      
      const status = $('.post-status .summary-content').text().trim() ||
                     $('.manga-status').text().trim() ||
                     'Unknown';
      
      return {
        title,
        coverUrl,
        description,
        status
      };
      
    } catch (error) {
      console.error('❌ Metadata scraping error:', error.message);
      throw new Error(`Failed to scrape manga metadata: ${error.message}`);
    }
  }

  /**
   * Scrape la liste des chapitres d'un manga
   * @param {string} mangaUrl - URL de la page du manga
   * @returns {Promise<Array<{chapterNumber: number, title: string, url: string, releaseDate?: string}>>}
   */
  async scrapeChapterList(mangaUrl) {
    console.log(`🔍 Scraping chapter list: ${mangaUrl}`);
    
    let browser;
    try {
      browser = await puppeteer.launch(this.browserConfig);
      const page = await browser.newPage();
      
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );
      
      await page.goto(mangaUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Extract chapter list - ADAPTER SELON LA STRUCTURE DU SITE
      const chapters = await page.evaluate(() => {
        const chapterElements = document.querySelectorAll('.wp-manga-chapter, .chapter-list li, .listing-chapters_wrap li');
        
        return Array.from(chapterElements).map(el => {
          const link = el.querySelector('a');
          const chapterText = link?.textContent.trim() || '';
          const chapterMatch = chapterText.match(/chapter\s+(\d+\.?\d*)/i);
          
          return {
            chapterNumber: chapterMatch ? parseFloat(chapterMatch[1]) : null,
            title: chapterText,
            url: link?.href,
            releaseDate: el.querySelector('.chapter-release-date')?.textContent.trim()
          };
        }).filter(ch => ch.url && ch.chapterNumber);
      });
      
      console.log(`✅ Found ${chapters.length} chapters`);
      return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
    } catch (error) {
      console.error('❌ Chapter list scraping error:', error.message);
      throw new Error(`Failed to scrape chapter list: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Teste si une URL est accessible
   * @param {string} url - URL à tester
   * @returns {Promise<boolean>}
   */
  async testUrl(url) {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ScraperService();
