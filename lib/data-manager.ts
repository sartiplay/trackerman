// Data management utilities for Trackerman

import fs from 'fs/promises';
import path from 'path';
import { TrackermanData, TrackermanSettings, Skin, SkinData } from '../types';
import { Logger } from './logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

export class DataManager {
  private static instance: DataManager;
  private data: TrackermanData | null = null;
  private settings: TrackermanSettings | null = null;
  private lastDataLoad: number = 0;

  private constructor() {}

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // Initialize data files
  public async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Initialize data.json if it doesn't exist
      try {
        await fs.access(DATA_FILE);
      } catch {
        const initialData: TrackermanData = {
          skins: [],
          lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
      }

      // Initialize settings.json if it doesn't exist
      try {
        await fs.access(SETTINGS_FILE);
      } catch {
        const defaultSettings: TrackermanSettings = {
          autoScheduler: {
            enabled: false,
            intervalMinutes: 30
          },
          discord: {
            enabled: false,
            notifications: {
              priceUpdate: true,
              thresholdHigh: true,
              thresholdLow: true
            }
          },
          scraping: {
            timeoutMs: 10000,
            delayBetweenRequests: 1000,
            maxRetries: 3
          },
          logging: {
            enabled: false,
            file: 'trackerman.log'
          }
        };
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
      }

      // Load data and settings
      await this.loadData();
      await this.loadSettings();
      Logger.configure(this.settings?.logging);
      Logger.info('DataManager initialized');
    } catch (error) {
      Logger.error('Failed to initialize data manager:', error);
      throw error;
    }
  }

  // Load data from file
  private async loadData(): Promise<void> {
    try {
      const dataContent = await fs.readFile(DATA_FILE, 'utf-8');
      this.data = JSON.parse(dataContent);
    } catch (error) {
      Logger.error('Failed to load data:', error);
      throw error;
    }
  }

  private loadDataSync(): void {
    try {
      const dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
      this.data = JSON.parse(dataContent);
      this.lastDataLoad = Date.now();
    } catch (error) {
      Logger.error('Failed to load data synchronously:', error);
      // Don't throw error, just keep existing data
    }
  }

  private isDataStale(): boolean {
    try {
      const stats = fs.statSync(DATA_FILE);
      return stats.mtime.getTime() > this.lastDataLoad;
    } catch {
      return true; // If we can't check, assume it's stale
    }
  }

  // Load settings from file
  private async loadSettings(): Promise<void> {
    try {
      const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
      this.settings = JSON.parse(settingsContent);
    } catch (error) {
      Logger.error('Failed to load settings:', error);
      throw error;
    }
  }

  // Save data to file
  private async saveData(): Promise<void> {
    if (!this.data) return;
    
    try {
      this.data.lastUpdated = new Date().toISOString();
      await fs.writeFile(DATA_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      Logger.error('Failed to save data:', error);
      throw error;
    }
  }

  // Save settings to file
  private async saveSettings(): Promise<void> {
    if (!this.settings) return;
    
    try {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      Logger.configure(this.settings?.logging);
    } catch (error) {
      Logger.error('Failed to save settings:', error);
      throw error;
    }
  }

  // Get all skins
  public getSkins(): Skin[] {
    // Only reload if data is not loaded or if file was modified recently
    if (!this.data || this.isDataStale()) {
      this.loadDataSync();
    }
    return this.data?.skins || [];
  }

  // Get specific skin by name and exterior
  public getSkin(name: string, exterior: string): Skin | undefined {
    return this.data?.skins.find(skin => 
      skin.name === name && skin.exterior === exterior
    );
  }

  // Get skin with only non-expired data points
  public getActiveSkin(name: string, exterior: string): Skin | undefined {
    const skin = this.getSkin(name, exterior);
    if (!skin) return undefined;

    return {
      ...skin,
      skindata: skin.skindata.filter(data => !data.expired)
    };
  }

  // Get all skins with only non-expired data points
  public getActiveSkins(): Skin[] {
    if (!this.data) return [];
    
    return this.data.skins.map(skin => ({
      ...skin,
      skindata: skin.skindata.filter(data => !data.expired)
    }));
  }

  // Add or update skin data
  public async addSkinData(name: string, exterior: string, skinData: SkinData, url: string): Promise<void> {
    if (!this.data) {
      await this.loadData();
    }

    const existingSkin = this.getSkin(name, exterior);
    
    if (existingSkin) {
      // Mark all existing data points as expired
      existingSkin.skindata.forEach(data => {
        data.expired = true;
      });
      
      // Add new data point (not expired by default)
      skinData.expired = false;
      existingSkin.skindata.push(skinData);
      existingSkin.url = url; // Update URL in case it changed
    } else {
      // Create new skin entry with first data point (not expired)
      skinData.expired = false;
      const newSkin: Skin = {
        name,
        exterior,
        url,
        skindata: [skinData]
      };
      this.data!.skins.push(newSkin);
    }

    Logger.info(`Added data for skin ${name} (${exterior}): ${skinData.price} ${skinData.currency}`);
    await this.saveData();
  }

  // Add new skin to track
  public async addSkin(skin: Skin): Promise<void> {
    if (!this.data) {
      await this.loadData();
    }

    const existingSkin = this.getSkin(skin.name, skin.exterior);
    if (existingSkin) {
      throw new Error(`Skin ${skin.name} (${skin.exterior}) already exists`);
    }

    this.data!.skins.push(skin);
    await this.saveData();
  }

  // Remove skin
  public async removeSkin(name: string, exterior: string): Promise<void> {
    if (!this.data) {
      await this.loadData();
    }

    this.data!.skins = this.data!.skins.filter(skin => 
      !(skin.name === name && skin.exterior === exterior)
    );
    await this.saveData();
  }

  // Update skin thresholds
  public async updateSkinThresholds(name: string, exterior: string, thresholds: { high?: number; low?: number }): Promise<void> {
    const skin = this.getSkin(name, exterior);
    if (!skin) {
      throw new Error(`Skin ${name} (${exterior}) not found`);
    }

    skin.thresholds = thresholds;
    await this.saveData();
  }

  // Get settings
  public getSettings(): TrackermanSettings {
    return this.settings!;
  }

  // Update settings
  public async updateSettings(settings: Partial<TrackermanSettings>): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    this.settings = { ...this.settings!, ...settings };
    await this.saveSettings();
  }

  // Get data file path (for API routes)
  public getDataFilePath(): string {
    return DATA_FILE;
  }

  // Get settings file path (for API routes)
  public getSettingsFilePath(): string {
    return SETTINGS_FILE;
  }
}
