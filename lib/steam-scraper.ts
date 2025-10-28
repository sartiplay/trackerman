// Steam market scraping functionality

import axios from 'axios';
import * as cheerio from 'cheerio';
import { SteamMarketItem, ScrapingOptions, ScrapingSettings } from '../types';
import { Logger } from './logger';

export class SteamMarketScraper {
  private settings: ScrapingSettings;

  constructor(settings: ScrapingSettings) {
    this.settings = settings;
  }

  // Parse Steam market URL to extract item name and exterior
  public parseSteamUrl(url: string): { name: string; exterior: string } {
    const urlObj = new URL(url);
    const query = urlObj.searchParams.get('q');
    
    if (!query) {
      throw new Error('Invalid Steam market URL: missing query parameter');
    }

    // Extract exterior from query
    const exteriors = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    let exterior = 'Unknown';
    let name = query;

    for (const ext of exteriors) {
      if (query.toLowerCase().includes(ext.toLowerCase())) {
        exterior = ext;
        name = query.replace(new RegExp(`\\b${ext}\\b`, 'gi'), '').trim();
        break;
      }
    }

    // Clean up the name
    name = name.replace(/\s+/g, ' ').trim();

    return { name, exterior };
  }

  // Scrape Steam market page
  public async scrapeMarketPage(url: string, options: ScrapingOptions): Promise<SteamMarketItem[]> {
    try {
      Logger.info('Scraping Steam market', { url, options });

      // Prefer JSON endpoint to avoid dynamic HTML issues
      // Example: https://steamcommunity.com/market/search/render?appid=730&norender=1&count=10&query=karambit+fade
      const u = new URL(url);
      const query = u.searchParams.get('q') || '';
      const appid = u.searchParams.get('appid') || '730';
      const count = Math.max(1, options.count || 10);
      const jsonUrl = `https://steamcommunity.com/market/search/render?appid=${appid}&norender=1&count=${count}&query=${encodeURIComponent(query)}`;

      const response = await axios.get(jsonUrl, {
        timeout: this.settings.timeoutMs,
        headers: {
          'Accept': 'application/json,text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
        }
      });

      let items: SteamMarketItem[] = [];

      if (typeof response.data === 'object' && response.data?.results) {
        for (const r of response.data.results) {
          if (items.length >= count) break;

          const fullName: string = r.name || '';
          const { name, exterior } = this.extractNameAndExterior(fullName);

          // Steam provides price as string like "$1,234.56" or "€1,234.56"
          const priceStr: string = r.sell_price_text || r.sale_price_text || '';
          const { price, currency } = this.parsePrice(priceStr);

          items.push({ name, exterior, price, currency });
          items.push({ name, exterior, price, currency });
        }
      } else {
        // Fallback to HTML if JSON not available
        const html = response.data?.results_html || '';
        const $ = cheerio.load(html);
        $('.market_listing_row_link').each((_, el) => {
          if (items.length >= count) return false;
          const fullName = $(el).find('.market_listing_item_name').text().trim();
          const priceStr = $(el).find('.normal_price, .sale_price, .market_table_value .normal_price').text().trim();
          const { name, exterior } = this.extractNameAndExterior(fullName);
          const { price, currency } = this.parsePrice(priceStr);
          items.push({ name, exterior, price, currency });
        });
      }

      // Optional: filter by exterior if specified
      if (options.exteriorFilter && options.exteriorFilter !== '') {
        const wanted = options.exteriorFilter.toLowerCase();
        items = items.filter((i) => i.exterior.toLowerCase() === wanted);
      }

      // Sort items by price based on options
      if (options.priceType === 'lowest') {
        items.sort((a, b) => a.price - b.price);
      } else {
        items.sort((a, b) => b.price - a.price);
      }

      return items.slice(0, options.count);

    } catch (error) {
      Logger.error('Failed to scrape Steam market', error);
      throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Scrape multiple URLs
  public async scrapeMultipleUrls(urls: string[], options: ScrapingOptions): Promise<SteamMarketItem[]> {
    const allItems: SteamMarketItem[] = [];

    for (let i = 0; i < urls.length; i++) {
      try {
        const items = await this.scrapeMarketPage(urls[i], options);
        allItems.push(...items);

        // Add delay between requests to respect rate limits
        if (i < urls.length - 1) {
          await this.delay(this.settings.delayBetweenRequests);
        }
      } catch (error) {
        Logger.error(`Failed to scrape URL ${urls[i]}`, error);
        // Continue with other URLs even if one fails
      }
    }

    return allItems;
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate Steam market URL
  public isValidSteamUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'steamcommunity.com' && 
             urlObj.pathname === '/market/search' &&
             urlObj.searchParams.has('appid') &&
             urlObj.searchParams.has('q');
    } catch {
      return false;
    }
  }

  // Update scraping settings
  public updateSettings(settings: ScrapingSettings): void {
    this.settings = settings;
  }

  // Helpers
  private extractNameAndExterior(fullName: string): { name: string; exterior: string } {
    const exteriors = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    let exterior = 'Unknown';
    let name = fullName;
    for (const ext of exteriors) {
      if (fullName.toLowerCase().includes(ext.toLowerCase())) {
        exterior = ext;
        name = fullName.replace(new RegExp(`\\b${ext}\\b`, 'gi'), '').trim();
        break;
      }
    }
    name = name.replace(/\s+/g, ' ').trim();
    return { name, exterior };
  }

  private parsePrice(text: string): { price: number; currency: string } {
    // Handles formats like "$1,234.56", "€1.234,56", etc.
    const currencyMatch = text.match(/[\p{Sc}]/u);
    const currency = currencyMatch ? currencyMatch[0] : '$';
    // Normalize to dot decimal: remove spaces, replace thousand sep, handle comma decimal
    const normalized = text
      .replace(/[^0-9,\.]/g, '')
      .replace(/(\d)[\s](\d)/g, '$1$2');
    let price = 0;
    if (/,\d{2}$/.test(normalized) && /\./.test(normalized)) {
      // both separators: remove thousands dot, replace comma decimal
      price = parseFloat(normalized.replace(/\./g, '').replace(',', '.')) || 0;
    } else if (/,\d{2}$/.test(normalized)) {
      price = parseFloat(normalized.replace(',', '.')) || 0;
    } else {
      price = parseFloat(normalized.replace(/,/g, '')) || 0;
    }
    return { price, currency };
  }
}
