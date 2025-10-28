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
    
    // Check if this is a specific item listing URL
    if (urlObj.pathname.includes('/market/listings/')) {
      // Extract from pathname: /market/listings/730/AK-47%20%7C%20Nightwish%20%28Field-Tested%29
      const pathParts = urlObj.pathname.split('/');
      const itemName = decodeURIComponent(pathParts[pathParts.length - 1]);
      return this.extractNameAndExterior(itemName);
    }
    
    // Handle search URLs
    const query = urlObj.searchParams.get('q');
    if (!query) {
      throw new Error('Invalid Steam market URL: missing query parameter');
    }

    return this.extractNameAndExterior(query);
  }

  // Scrape Steam market page
  public async scrapeMarketPage(url: string, options: ScrapingOptions): Promise<SteamMarketItem[]> {
    try {
      Logger.info('Scraping Steam market', { url, options });

      const u = new URL(url);
      let items: SteamMarketItem[] = [];

      // Check if this is a specific item listing page or search page
      if (u.pathname.includes('/market/listings/')) {
        // This is a specific item page - scrape individual listings
        items = await this.scrapeItemListings(url, options);
      } else {
        // This is a search page - use the existing search logic
        items = await this.scrapeSearchResults(url, options);
      }

      return items;

    } catch (error) {
      Logger.error('Failed to scrape Steam market', error);
      throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Scrape individual listings from a specific item page
  private async scrapeItemListings(url: string, options: ScrapingOptions): Promise<SteamMarketItem[]> {
    const response = await axios.get(url, {
      timeout: this.settings.timeoutMs,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    let items: SteamMarketItem[] = [];

    // Extract item name and exterior from the page title or breadcrumb
    const pageTitle = $('title').text();
    const breadcrumb = $('.breadcrumb').text();
    const itemInfo = this.extractNameAndExterior(pageTitle || breadcrumb);

    // Find all listing rows
    $('.market_listing_row').each((_, el) => {
      if (items.length >= options.count) return false;

      const $row = $(el);
      
      // Extract price
      const priceElement = $row.find('.market_listing_price .normal_price, .market_listing_price .sale_price');
      const priceText = priceElement.text().trim();
      const { price, currency } = this.parsePrice(priceText);

      if (price > 0) {
        // Extract seller info if available
        const sellerElement = $row.find('.market_listing_owner_link');
        const sellerName = sellerElement.text().trim() || 'Unknown Seller';
        const sellerId = sellerElement.attr('href')?.split('/profiles/')[1] || '';

        // Extract listing ID from the row
        const listingId = $row.attr('id') || `listing_${Date.now()}_${Math.random()}`;

        items.push({
          name: itemInfo.name,
          exterior: itemInfo.exterior,
          price,
          currency,
          listingId,
          sellerId,
          sellerName
        });
      }
    });

    // Filter by exterior if specified
    if (options.exteriorFilter && options.exteriorFilter.length > 0) {
      const wanted = options.exteriorFilter.toLowerCase();
      items = items.filter((i) => i.exterior.toLowerCase() === wanted);
    }

    // Sort by price based on options
    if (options.priceType === 'lowest') {
      items.sort((a, b) => a.price - b.price);
    } else {
      items.sort((a, b) => b.price - a.price);
    }

    return items.slice(0, options.count);
  }

  // Scrape search results (existing logic)
  private async scrapeSearchResults(url: string, options: ScrapingOptions): Promise<SteamMarketItem[]> {
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

        const priceStr: string = r.sell_price_text || r.sale_price_text || '';
        const { price, currency } = this.parsePrice(priceStr);

        items.push({ 
          name, 
          exterior, 
          price, 
          currency,
          listingId: r.listingid || `search_${Date.now()}_${Math.random()}`,
          sellerId: r.asset?.id || '',
          sellerName: 'Search Result'
        });
      }
    } else {
      const html = response.data?.results_html || '';
      const $ = cheerio.load(html);
      $('.market_listing_row_link').each((_, el) => {
        if (items.length >= count) return false;
        const fullName = $(el).find('.market_listing_item_name').text().trim();
        const priceStr = $(el).find('.normal_price, .sale_price, .market_table_value .normal_price').text().trim();
        const { name, exterior } = this.extractNameAndExterior(fullName);
        const { price, currency } = this.parsePrice(priceStr);
        items.push({ 
          name, 
          exterior, 
          price, 
          currency,
          listingId: `search_${Date.now()}_${Math.random()}`,
          sellerName: 'Search Result'
        });
      });
    }

    // Filter by exterior if specified
    if (options.exteriorFilter && options.exteriorFilter.length > 0) {
      const wanted = options.exteriorFilter.toLowerCase();
      items = items.filter((i) => i.exterior.toLowerCase() === wanted);
    }

    // Sort by price based on options
    if (options.priceType === 'lowest') {
      items.sort((a, b) => a.price - b.price);
    } else {
      items.sort((a, b) => b.price - a.price);
    }

    return items.slice(0, options.count);
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
             (urlObj.pathname === '/market/search' ||
              urlObj.pathname.includes('/market/listings/')) &&
             (urlObj.searchParams.has('appid') && urlObj.searchParams.has('q') ||
              urlObj.pathname.includes('/market/listings/'));
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
