// Discord webhook notification system

import axios from 'axios';
import { DiscordNotificationSettings, Skin, SkinData } from '../types';
import { Logger } from './logger';

export class DiscordNotifier {
  private settings: DiscordNotificationSettings;

  constructor(settings: DiscordNotificationSettings) {
    this.settings = settings;
  }

  // Send price update notification
  public async sendPriceUpdateNotification(skin: Skin, newData: SkinData): Promise<void> {
    if (!this.settings.enabled || !this.settings.notifications.priceUpdate || !this.settings.webhookUrl) {
      return;
    }

    const embed = {
      title: `💰 Price Update - ${skin.name}`,
      description: `**Exterior:** ${skin.exterior}`,
      color: 0x00ff00, // Green color
      fields: [
        {
          name: 'Current Price',
          value: `${newData.price} ${newData.currency}`,
          inline: true
        },
        {
          name: 'Previous Price',
          value: skin.skindata.length > 1 
            ? `${skin.skindata[skin.skindata.length - 2].price} ${skin.skindata[skin.skindata.length - 2].currency}`
            : 'N/A',
          inline: true
        },
        {
          name: 'Price Change',
          value: this.calculatePriceChange(skin, newData),
          inline: true
        },
        {
          name: 'Steam Market',
          value: `[View Item](${skin.url})`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Trackerman - CS2 Item Tracker'
      }
    };

    Logger.info('Discord: Sending price update', { skin: skin.name, exterior: skin.exterior, price: newData.price });
    await this.sendWebhook(embed);
  }

  // Send threshold hit notification
  public async sendThresholdNotification(skin: Skin, newData: SkinData, thresholdType: 'high' | 'low'): Promise<void> {
    if (!this.settings.enabled || !this.settings.webhookUrl) {
      return;
    }

    const shouldNotify = thresholdType === 'high' 
      ? this.settings.notifications.thresholdHigh 
      : this.settings.notifications.thresholdLow;

    if (!shouldNotify) {
      return;
    }

    const threshold = thresholdType === 'high' ? skin.thresholds?.high : skin.thresholds?.low;
    if (!threshold) return;

    const embed = {
      title: `🚨 Threshold Alert - ${skin.name}`,
      description: `**Exterior:** ${skin.exterior}\n**Threshold ${thresholdType === 'high' ? 'High' : 'Low'} Hit!**`,
      color: thresholdType === 'high' ? 0xff0000 : 0x0000ff, // Red for high, blue for low
      fields: [
        {
          name: 'Current Price',
          value: `${newData.price} ${newData.currency}`,
          inline: true
        },
        {
          name: `${thresholdType === 'high' ? 'High' : 'Low'} Threshold`,
          value: `${threshold} ${newData.currency}`,
          inline: true
        },
        {
          name: 'Steam Market',
          value: `[View Item](${skin.url})`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Trackerman - CS2 Item Tracker'
      }
    };

    Logger.info('Discord: Sending threshold alert', { skin: skin.name, exterior: skin.exterior, type: thresholdType, price: newData.price });
    await this.sendWebhook(embed);
  }

  // Send general notification
  public async sendGeneralNotification(title: string, description: string, color: number = 0x0099ff): Promise<void> {
    if (!this.settings.enabled || !this.settings.webhookUrl) {
      return;
    }

    const embed = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Trackerman - CS2 Item Tracker'
      }
    };

    Logger.info('Discord: Sending general notification', { title });
    await this.sendWebhook(embed);
  }

  // Send webhook message
  private async sendWebhook(embed: any): Promise<void> {
    try {
      await axios.post(this.settings.webhookUrl!, {
        embeds: [embed]
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      Logger.error('Failed to send Discord webhook', error);
      throw new Error(`Discord notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate price change percentage
  private calculatePriceChange(skin: Skin, newData: SkinData): string {
    if (skin.skindata.length < 2) {
      return 'N/A';
    }

    const previousPrice = skin.skindata[skin.skindata.length - 2].price;
    const currentPrice = newData.price;
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    const sign = change >= 0 ? '+' : '';
    const emoji = change >= 0 ? '📈' : '📉';
    
    return `${emoji} ${sign}${change.toFixed(2)}%`;
  }

  // Test webhook connection
  public async testWebhook(): Promise<boolean> {
    if (!this.settings.webhookUrl) {
      return false;
    }

    try {
      await this.sendGeneralNotification(
        '🔧 Webhook Test',
        'This is a test message from Trackerman. Your Discord webhook is working correctly!',
        0x00ff00
      );
      return true;
    } catch (error) {
      Logger.error('Webhook test failed', error);
      return false;
    }
  }

  // Update notification settings
  public updateSettings(settings: DiscordNotificationSettings): void {
    this.settings = settings;
  }

  // Validate webhook URL
  public static isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'discord.com' && urlObj.pathname.startsWith('/api/webhooks/');
    } catch {
      return false;
    }
  }
}
