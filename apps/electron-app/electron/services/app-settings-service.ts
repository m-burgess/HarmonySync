/**
 * App Settings Storage Service
 * 
 * Manages persistent application settings stored in JSON file
 * Location: ~/.harmonysync/app-settings.json
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// ==================== Types ====================

export interface AppSettings {
  serviceOrder: {
    watchFolder: string;
    autoImportOnStartup: boolean;
    cleanupOldServices: boolean;
    maxServiceAge: number; // days
    lastImportedService?: string;
  };
  // Add other settings sections as needed
  display?: any;
  audio?: any;
}

const DEFAULT_SETTINGS: AppSettings = {
  serviceOrder: {
    watchFolder: '',
    autoImportOnStartup: false,
    cleanupOldServices: true,
    maxServiceAge: 7,
  },
};

// ==================== Settings Storage Service ====================

export class AppSettingsService {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    const configDir = path.join(os.homedir(), '.harmonysync');
    this.settingsPath = path.join(configDir, 'app-settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
    
    // Ensure directory exists
    fs.ensureDirSync(configDir);
  }

  /**
   * Load settings from file
   */
  async load(): Promise<AppSettings> {
    try {
      if (await fs.pathExists(this.settingsPath)) {
        const data = await fs.readFile(this.settingsPath, 'utf-8');
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  /**
   * Save settings to file
   */
  async save(settings: AppSettings): Promise<void> {
    try {
      this.settings = settings;
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save app settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get current settings
   */
  get(): AppSettings {
    return this.settings;
  }

  /**
   * Get service order settings
   */
  getServiceOrderSettings() {
    return this.settings.serviceOrder;
  }

  /**
   * Update service order settings
   */
  async updateServiceOrderSettings(updates: Partial<AppSettings['serviceOrder']>): Promise<void> {
    this.settings.serviceOrder = {
      ...this.settings.serviceOrder,
      ...updates,
    };
    await this.save(this.settings);
  }

  /**
   * Reset settings to defaults
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.save(this.settings);
  }
}

// Export singleton instance
export const appSettingsService = new AppSettingsService();
export default appSettingsService;
