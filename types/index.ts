// Core data types for Trackerman

export interface SkinData {
  timestamp: string;
  price: number;
  currency: string;
  listingId?: string;
  sellerId?: string;
  sellerName?: string;
  expired?: boolean;
}

export interface Skin {
  name: string;
  exterior: string;
  url: string;
  skindata: SkinData[];
  thresholds?: {
    high?: number;
    low?: number;
  };
}

export interface TrackermanData {
  skins: Skin[];
  lastUpdated: string;
}

export interface DiscordNotificationSettings {
  enabled: boolean;
  webhookUrl?: string;
  notifications: {
    priceUpdate: boolean;
    thresholdHigh: boolean;
    thresholdLow: boolean;
  };
}

export interface AutoSchedulerSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastRun?: string;
}

export interface ScrapingSettings {
  timeoutMs: number;
  delayBetweenRequests: number;
  maxRetries: number;
}

export interface TrackermanSettings {
  autoScheduler: AutoSchedulerSettings;
  discord: DiscordNotificationSettings;
  scraping: ScrapingSettings;
  logging?: {
    enabled: boolean;
    file?: string; // default: trackerman.log in project root
  };
}

export interface ScrapingOptions {
  fetchType: 'single' | 'all' | 'selected';
  priceType: 'lowest' | 'highest';
  count: number;
  selectedSkins?: string[];
  exteriorFilter?: 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred' | 'Unknown' | '';
}

export interface SteamMarketItem {
  name: string;
  exterior: string;
  price: number;
  currency: string;
  listingId?: string;
  sellerId?: string;
  sellerName?: string;
}
