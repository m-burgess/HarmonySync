// Moved to apps/electron-app/services/display-config-service.ts
// Please update imports to reference the new location.
export {};

import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService } from '../types/services';
import { IDisplayConfigService, ServiceConfig } from '../types/services';
import { DisplayConfig } from '../types/models';

/**
 * Default display configurations
 */
const DEFAULT_DISPLAYS: DisplayConfig[] = [
  {
    id: 'audience',
    name: 'Audience',
    type: 'audience',
    enabled: true,
    order: 1,
    settings: {
      deviceId: '',
      ndiOutput: ''
    }
  },
  {
    id: 'confidence',
    name: 'Confidence Monitor',
    type: 'confidence',
    enabled: true,
    order: 2,
    settings: {
      deviceId: '',
      ndiOutput: ''
    }
  },
  {
    id: 'lower-thirds',
    name: 'Lower Thirds',
    type: 'lowerthirds',
    enabled: true,
    order: 3,
    settings: {
      deviceId: '',
      ndiOutput: ''
    }
  }
];

/**
 * Display Configuration Service Implementation
 * Manages display configurations with JSON persistence
 */
export class DisplayConfigService extends BaseElectronService implements IDisplayConfigService {
  protected readonly serviceName = 'DisplayConfigService';

  private displayConfigs: DisplayConfig[] = [];
  private settingsPath: string = '';

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the display configuration service
   */
  protected override async onInitialize(): Promise<void> {
    const appDataPath = app.getPath('userData');
    this.settingsPath = path.join(appDataPath, 'settings');

    // Ensure settings directory exists
    await fs.ensureDir(this.settingsPath);

    // Load display configurations
    await this.loadDisplayConfigs();

    this.log('info', 'Display configuration service initialized');
    this.log('info', `Settings path: ${this.settingsPath}`);
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.displayConfigs = [];
    this.log('info', 'Display configuration service disposed');
  }

  /**
   * Load display configurations from JSON file
   */
  private async loadDisplayConfigs(): Promise<void> {
    const configPath = path.join(this.settingsPath, 'display_configs.json');
    try {
      if (await fs.pathExists(configPath)) {
        const data = await fs.readJson(configPath);
        this.displayConfigs = data.displays || [...DEFAULT_DISPLAYS];
        this.log('info', `Loaded ${this.displayConfigs.length} display configurations`);
      } else {
        // Create default configuration
        this.displayConfigs = [...DEFAULT_DISPLAYS];
        await this.saveDisplayConfigs();
        this.log('info', 'Created default display configurations');
      }
    } catch (error) {
      this.log('error', 'Error loading display configs:', error);
      this.displayConfigs = [...DEFAULT_DISPLAYS];
      await this.saveDisplayConfigs();
    }
  }

  /**
   * Save display configurations to JSON file
   */
  private async saveDisplayConfigs(): Promise<void> {
    const configPath = path.join(this.settingsPath, 'display_configs.json');
    try {
      await fs.writeJson(configPath, { displays: this.displayConfigs }, { spaces: 2 });
      this.log('debug', 'Display configurations saved');
      this.emit('configs-saved', this.displayConfigs);
    } catch (error) {
      this.handleError('saveDisplayConfigs', error);
    }
  }

  /**
   * Get all display configurations
   */
  public async getAll(): Promise<DisplayConfig[]> {
    this.ensureInitialized();
    return [...this.displayConfigs];
  }

  /**
   * Get a specific display configuration by id
   */
  public async get(id: string): Promise<DisplayConfig | null> {
    this.ensureInitialized();
    const config = this.displayConfigs.find(d => d.id === id);
    
    if (!config) {
      this.log('warn', `Display configuration not found: ${id}`);
      return null;
    }
    
    return { ...config };
  }

  /**
   * Get enabled display configurations sorted by order
   */
  public async getEnabled(): Promise<DisplayConfig[]> {
    this.ensureInitialized();
    return this.displayConfigs
      .filter(d => d.enabled)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(d => ({ ...d }));
  }

  /**
   * Create a new display configuration
   */
  public async create(config: Partial<DisplayConfig>): Promise<string> {
    this.ensureInitialized();

    // Generate unique ID
    const randomStr = Math.random().toString(36).substring(2, 9);
    const id = config.id || `display-${Date.now()}-${randomStr}`;

    // Validate required fields
    if (!config.name) {
      throw new Error('Display configuration name is required');
    }

    const newConfig: DisplayConfig = {
      id,
      name: config.name,
      type: config.type || 'custom',
      enabled: config.enabled ?? true,
      displayId: config.displayId,
      bounds: config.bounds,
      settings: config.settings || {},
      order: config.order || this.displayConfigs.length + 1
    };

    this.displayConfigs.push(newConfig);
    await this.saveDisplayConfigs();

    this.log('info', `Created display configuration: ${id}`);
    this.emit('config-created', newConfig);
    
    return id;
  }

  /**
   * Update an existing display configuration
   */
  public async update(id: string, updates: Partial<DisplayConfig>): Promise<void> {
    this.ensureInitialized();

    const index = this.displayConfigs.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Display configuration not found: ${id}`);
    }

    // Merge updates while preserving id
    this.displayConfigs[index] = {
      ...this.displayConfigs[index],
      ...updates,
      id // Preserve the original id
    };

    await this.saveDisplayConfigs();

    this.log('info', `Updated display configuration: ${id}`);
    this.emit('config-updated', this.displayConfigs[index]);
  }

  /**
   * Delete a display configuration
   */
  public async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const index = this.displayConfigs.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Display configuration not found: ${id}`);
    }

    const deletedConfig = this.displayConfigs[index];
    this.displayConfigs.splice(index, 1);
    await this.saveDisplayConfigs();

    this.log('info', `Deleted display configuration: ${id}`);
    this.emit('config-deleted', { id, config: deletedConfig });
  }

  /**
   * Reorder display configurations
   * @param ids - Array of display IDs in the new order
   */
  public async reorder(ids: string[]): Promise<void> {
    this.ensureInitialized();

    const reordered: DisplayConfig[] = [];
    
    ids.forEach((id, index) => {
      const config = this.displayConfigs.find(d => d.id === id);
      if (config) {
        reordered.push({
          ...config,
          order: index + 1
        });
      } else {
        this.log('warn', `Display configuration not found during reorder: ${id}`);
      }
    });

    // Add any configs that weren't in the reorder list (shouldn't happen normally)
    this.displayConfigs.forEach(config => {
      if (!ids.includes(config.id)) {
        this.log('warn', `Display configuration not in reorder list, appending: ${config.id}`);
        reordered.push(config);
      }
    });

    this.displayConfigs = reordered;
    await this.saveDisplayConfigs();

    this.log('info', `Reordered ${reordered.length} display configurations`);
    this.emit('configs-reordered', this.displayConfigs);
  }

  /**
   * Enable a display configuration
   */
  public async enable(id: string): Promise<void> {
    await this.update(id, { enabled: true });
    this.log('info', `Enabled display configuration: ${id}`);
  }

  /**
   * Disable a display configuration
   */
  public async disable(id: string): Promise<void> {
    await this.update(id, { enabled: false });
    this.log('info', `Disabled display configuration: ${id}`);
  }

  /**
   * Reset to default display configurations
   */
  public async resetToDefaults(): Promise<void> {
    this.ensureInitialized();
    
    this.displayConfigs = [...DEFAULT_DISPLAYS];
    await this.saveDisplayConfigs();
    
    this.log('info', 'Reset display configurations to defaults');
    this.emit('configs-reset', this.displayConfigs);
  }

  /**
   * Get display configuration by type
   */
  public async getByType(type: DisplayConfig['type']): Promise<DisplayConfig[]> {
    this.ensureInitialized();
    return this.displayConfigs
      .filter(d => d.type === type)
      .map(d => ({ ...d }));
  }

  /**
   * Check if a display configuration exists
   */
  public async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.displayConfigs.some(d => d.id === id);
  }

  /**
   * Get total count of display configurations
   */
  public getCount(): number {
    return this.displayConfigs.length;
  }

  /**
   * Get count of enabled display configurations
   */
  public getEnabledCount(): number {
    return this.displayConfigs.filter(d => d.enabled).length;
  }
}

// Export singleton instance
let displayConfigInstance: DisplayConfigService | null = null;

/**
 * Get or create the display config service singleton
 */
export function getDisplayConfigService(config?: ServiceConfig): DisplayConfigService {
  if (!displayConfigInstance) {
    displayConfigInstance = new DisplayConfigService(config);
  }
  return displayConfigInstance;
}

// Export for backward compatibility
export default DisplayConfigService;
