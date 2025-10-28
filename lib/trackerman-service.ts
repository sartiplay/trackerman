// Main tracking service for Trackerman

import { DataManager } from './data-manager';
import { SteamMarketScraper } from './steam-scraper';
import { DiscordNotifier } from './discord-notifier';
import { AutoScheduler } from './auto-scheduler';
import { 
  TrackermanSettings, 
  ScrapingOptions, 
  Skin, 
  SkinData, 
  SteamMarketItem 
} from '../types';
import { Logger } from './logger';

export class TrackermanService {
  private dataManager: DataManager;
  private scraper: SteamMarketScraper | null = null;
  private notifier: DiscordNotifier | null = null;
  private scheduler: AutoScheduler | null = null;
  private settings: TrackermanSettings | null = null;
  private initialized = false;

  constructor() {
    this.dataManager = DataManager.getInstance();
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    await this.dataManager.initialize();
    this.settings = this.dataManager.getSettings();
    
    // Initialize components with current settings
    this.scraper = new SteamMarketScraper(this.settings.scraping);
    this.notifier = new DiscordNotifier(this.settings.discord);
    this.scheduler = new AutoScheduler(
      this.dataManager,
      this.scraper,
      this.notifier,
      this.settings.autoScheduler
    );

    this.initialized = true;

    // Start auto-scheduler if enabled
    if (this.settings.autoScheduler.enabled) {
      this.scheduler.start();
    }
    Logger.info('TrackermanService initialized');
  }

  // Ensure service is initialized
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TrackermanService must be initialized before use');
    }
  }

  // Add new skin to track
  public async addSkin(url: string, thresholds?: { high?: number; low?: number }, exteriorOverride?: string): Promise<void> {
    this.ensureInitialized();
    
    if (!this.scraper!.isValidSteamUrl(url)) {
      throw new Error('Invalid Steam market URL');
    }

    let { name, exterior } = this.scraper!.parseSteamUrl(url);
    if (exteriorOverride && exteriorOverride.trim()) {
      exterior = exteriorOverride as any;
    }
    
    // Check if skin already exists
    const existingSkin = this.dataManager.getSkin(name, exterior);
    if (existingSkin) {
      throw new Error(`Skin ${name} (${exterior}) is already being tracked`);
    }

    // Create new skin
    const newSkin: Skin = {
      name,
      exterior,
      url,
      skindata: [],
      thresholds
    };

    Logger.info('Adding skin', { name, exterior, url });
    await this.dataManager.addSkin(newSkin);
  }

  // Remove skin from tracking
  public async removeSkin(name: string, exterior: string): Promise<void> {
    this.ensureInitialized();
    await this.dataManager.removeSkin(name, exterior);
  }

  // Update skin thresholds
  public async updateSkinThresholds(name: string, exterior: string, thresholds: { high?: number; low?: number }): Promise<void> {
    this.ensureInitialized();
    await this.dataManager.updateSkinThresholds(name, exterior, thresholds);
  }

  // Fetch data for specific skin
  public async fetchSkinData(name: string, exterior: string, options: ScrapingOptions): Promise<SteamMarketItem[]> {
    this.ensureInitialized();
    
    const skin = this.dataManager.getSkin(name, exterior);
    if (!skin) {
      throw new Error(`Skin ${name} (${exterior}) not found`);
    }

    Logger.info('Fetching skin data', { name, exterior, options });
    const items = await this.scraper!.scrapeMarketPage(skin.url, options);
    
    // Add new data to the skin
    for (const item of items) {
      const skinData: SkinData = {
        timestamp: new Date().toISOString(),
        price: item.price,
        currency: item.currency,
        listingId: item.listingId,
        sellerId: item.sellerId
      };

      await this.dataManager.addSkinData(name, exterior, skinData, skin.url);

      // Check for notifications
      const updatedSkin = this.dataManager.getSkin(name, exterior)!;
      await this.checkAndSendNotifications(updatedSkin, skinData);
    }

    return items;
  }

  // Fetch data for all skins
  public async fetchAllSkinsData(options: ScrapingOptions): Promise<{ [key: string]: SteamMarketItem[] }> {
    this.ensureInitialized();
    
    const skins = this.dataManager.getSkins();
    const results: { [key: string]: SteamMarketItem[] } = {};

    for (const skin of skins) {
      try {
        const items = await this.scraper!.scrapeMarketPage(skin.url, options);
        results[`${skin.name}_${skin.exterior}`] = items;

        // Add new data to the skin
        for (const item of items) {
          const skinData: SkinData = {
            timestamp: new Date().toISOString(),
            price: item.price,
            currency: item.currency,
            listingId: item.listingId,
            sellerId: item.sellerId
          };

          await this.dataManager.addSkinData(skin.name, skin.exterior, skinData, skin.url);
        }

        // Check for notifications
        const updatedSkin = this.dataManager.getSkin(skin.name, skin.exterior)!;
        if (updatedSkin.skindata.length > 0) {
          const latestData = updatedSkin.skindata[updatedSkin.skindata.length - 1];
          await this.checkAndSendNotifications(updatedSkin, latestData);
        }
      } catch (error) {
        Logger.error(`Failed to fetch data for ${skin.name} (${skin.exterior})`, error);
        results[`${skin.name}_${skin.exterior}`] = [];
      }
    }

    return results;
  }

  // Check and send notifications
  private async checkAndSendNotifications(skin: Skin, newData: SkinData): Promise<void> {
    try {
      // Check for price changes
      if (skin.skindata.length > 1) {
        const previousData = skin.skindata[skin.skindata.length - 2];
        const priceChanged = previousData.price !== newData.price;
        
        if (priceChanged) {
          await this.notifier!.sendPriceUpdateNotification(skin, newData);
        }
      }

      // Check thresholds
      if (skin.thresholds) {
        if (skin.thresholds.high && newData.price >= skin.thresholds.high) {
          await this.notifier!.sendThresholdNotification(skin, newData, 'high');
        }
        if (skin.thresholds.low && newData.price <= skin.thresholds.low) {
          await this.notifier!.sendThresholdNotification(skin, newData, 'low');
        }
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }
  }

  // Update settings
  public async updateSettings(newSettings: Partial<TrackermanSettings>): Promise<void> {
    this.ensureInitialized();
    
    this.settings = { ...this.settings!, ...newSettings };
    await this.dataManager.updateSettings(this.settings);

    // Update components
    this.scraper!.updateSettings(this.settings.scraping);
    this.notifier!.updateSettings(this.settings.discord);
    await this.scheduler!.updateSettings(this.settings.autoScheduler);

    // Restart scheduler if settings changed
    if (this.settings.autoScheduler.enabled) {
      this.scheduler!.start();
    } else {
      this.scheduler!.stop();
    }
  }

  // Get all tracked skins
  public getSkins(): Skin[] {
    this.ensureInitialized();
    return this.dataManager.getActiveSkins();
  }

  // Get specific skin
  public getSkin(name: string, exterior: string): Skin | undefined {
    this.ensureInitialized();
    return this.dataManager.getActiveSkin(name, exterior);
  }

  // Get current settings
  public getSettings(): TrackermanSettings {
    this.ensureInitialized();
    return this.settings!;
  }

  // Get scheduler status
  public getSchedulerStatus() {
    this.ensureInitialized();
    return this.scheduler!.getStatus();
  }

  // Test Discord webhook
  public async testDiscordWebhook(): Promise<boolean> {
    this.ensureInitialized();
    return await this.notifier!.testWebhook();
  }

  // Manual trigger scheduler
  public async manualTriggerScheduler(): Promise<void> {
    this.ensureInitialized();
    await this.scheduler!.manualTrigger();
  }

  // Stop the service
  public stop(): void {
    if (this.scheduler) {
      this.scheduler.stop();
    }
  }
}
