// Auto-scheduler system for Trackerman

import * as cron from 'node-cron';
import { DataManager } from './data-manager';
import { SteamMarketScraper } from './steam-scraper';
import { DiscordNotifier } from './discord-notifier';
import { AutoSchedulerSettings, ScrapingOptions, TrackermanSettings } from '../types';
import { Logger } from './logger';

export class AutoScheduler {
  private dataManager: DataManager;
  private scraper: SteamMarketScraper;
  private notifier: DiscordNotifier;
  private cronJob: cron.ScheduledTask | null = null;
  private settings: AutoSchedulerSettings;

  constructor(
    dataManager: DataManager,
    scraper: SteamMarketScraper,
    notifier: DiscordNotifier,
    settings: AutoSchedulerSettings
  ) {
    this.dataManager = dataManager;
    this.scraper = scraper;
    this.notifier = notifier;
    this.settings = settings;
  }

  // Start the auto-scheduler
  public start(): void {
    if (!this.settings.enabled) {
      console.log('Auto-scheduler is disabled');
      return;
    }

    if (this.cronJob) {
      this.stop();
    }

    // Create cron expression for the interval
    const cronExpression = this.createCronExpression(this.settings.intervalMinutes);
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        Logger.info('Auto-scheduler: Starting scheduled fetch...');
        await this.executeScheduledFetch();
        Logger.info('Auto-scheduler: Scheduled fetch completed');
      } catch (error) {
        Logger.error('Auto-scheduler: Error during scheduled fetch:', error);
        await this.notifier.sendGeneralNotification(
          '⚠️ Auto-Scheduler Error',
          `An error occurred during the scheduled fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          0xff0000
        );
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    Logger.info(`Auto-scheduler started with interval: ${this.settings.intervalMinutes} minutes`);
  }

  // Stop the auto-scheduler
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
      Logger.info('Auto-scheduler stopped');
    }
  }

  // Execute scheduled fetch
  private async executeScheduledFetch(): Promise<void> {
    const skins = this.dataManager.getSkins();
    
    if (skins.length === 0) {
      Logger.info('Auto-scheduler: No skins to fetch');
      return;
    }

    const scrapingOptions: ScrapingOptions = {
      fetchType: 'all',
      priceType: 'lowest',
      count: 1
    };

    let successCount = 0;
    let errorCount = 0;

    for (const skin of skins) {
      try {
        const items = await this.scraper.scrapeMarketPage(skin.url, scrapingOptions);
        
        if (items.length > 0) {
          const item = items[0];
          const skinData = {
            timestamp: new Date().toISOString(),
            price: item.price,
            currency: item.currency,
            listingId: item.listingId,
            sellerId: item.sellerId
          };

          // Check for price changes and thresholds
          const previousData = skin.skindata[skin.skindata.length - 1];
          const priceChanged = !previousData || previousData.price !== item.price;

          // Add new data
          await this.dataManager.addSkinData(skin.name, skin.exterior, skinData, skin.url);

          // Send notifications if enabled
          if (priceChanged) {
            await this.notifier.sendPriceUpdateNotification(skin, skinData);
          }

          // Check thresholds
          if (skin.thresholds) {
            if (skin.thresholds.high && item.price >= skin.thresholds.high) {
              await this.notifier.sendThresholdNotification(skin, skinData, 'high');
            }
            if (skin.thresholds.low && item.price <= skin.thresholds.low) {
              await this.notifier.sendThresholdNotification(skin, skinData, 'low');
            }
          }

          successCount++;
        }
      } catch (error) {
        Logger.error(`Auto-scheduler: Failed to fetch ${skin.name} (${skin.exterior})`, error);
        errorCount++;
      }
    }

    // Update last run time
    await this.dataManager.updateSettings({
      autoScheduler: {
        ...this.settings,
        lastRun: new Date().toISOString()
      }
    });

    Logger.info(`Auto-scheduler: Completed - ${successCount} successful, ${errorCount} errors`);
  }

  // Create cron expression from minutes
  private createCronExpression(minutes: number): string {
    if (minutes < 1) {
      throw new Error('Interval must be at least 1 minute');
    }

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (remainingMinutes === 0) {
        return `0 */${hours} * * * *`; // Every X hours
      } else {
        return `0 */${remainingMinutes} */${hours} * * *`; // Every X minutes, every Y hours
      }
    } else {
      return `0 */${minutes} * * * *`; // Every X minutes
    }
  }

  // Update scheduler settings
  public async updateSettings(newSettings: AutoSchedulerSettings): Promise<void> {
    const wasRunning = this.cronJob?.running;
    
    if (wasRunning) {
      this.stop();
    }

    this.settings = newSettings;

    if (newSettings.enabled && wasRunning) {
      this.start();
    }
  }

  // Get current status
  public getStatus(): {
    enabled: boolean;
    intervalMinutes: number;
    lastRun?: string;
    nextRun?: string;
    running: boolean;
  } {
    return {
      enabled: this.settings.enabled,
      intervalMinutes: this.settings.intervalMinutes,
      lastRun: this.settings.lastRun,
      nextRun: this.cronJob?.running ? 'Calculating...' : undefined,
      running: this.cronJob?.running || false
    };
  }

  // Manual trigger (for testing)
  public async manualTrigger(): Promise<void> {
    console.log('Auto-scheduler: Manual trigger initiated');
    await this.executeScheduledFetch();
  }
}
