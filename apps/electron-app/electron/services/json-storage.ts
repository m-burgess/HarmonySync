/**
 * JSON Storage Service
 * JSON-based storage system for all data persistence
 * Replaces the old SQLite database with simple JSON files
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService } from '@harmonysync/core';
import { IStorageService, ServiceConfig } from '@harmonysync/core';
import { ScheduledEvent, Macro } from '@harmonysync/core';

/**
 * Google Drive sync configuration
 */
interface GDriveSyncConfig {
  id: number;
  folder_id: string;
  local_path: string;
  last_sync: string | null;
  enabled: boolean;
}

/**
 * YouTube link data
 */
interface YouTubeLink {
  id: number;
  url: string;
  presentation_path: string;
}

/**
 * Song/Presentation metadata
 */
interface SongMetadata {
  [key: string]: any;
  updated_at?: string;
}

/**
 * JSON Storage Service Implementation
 * Provides data persistence using JSON files
 */
export class JSONStorageService extends BaseElectronService implements IStorageService {
  protected readonly serviceName = 'JSONStorageService';

  private storagePath: string = '';
  private scheduledEvents: ScheduledEvent[] = [];
  private macros: Macro[] = [];
  private gdriveSyncConfig: GDriveSyncConfig[] = [];
  private appSettings: Record<string, any> = {};

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the storage service
   */
  protected override async onInitialize(): Promise<void> {
    const appDataPath = app.getPath('userData');
    this.storagePath = path.join(appDataPath, 'harmonysync-data');

    // Ensure storage directory exists
    await fs.ensureDir(this.storagePath);

    // Load all data from JSON files
    await this.loadScheduledEvents();
    await this.loadMacros();
    await this.loadGDriveSyncConfig();
    await this.loadAppSettings();

    this.log('info', 'JSON storage initialized successfully');
    this.log('info', `Storage path: ${this.storagePath}`);
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    // Clear in-memory data
    this.scheduledEvents = [];
    this.macros = [];
    this.gdriveSyncConfig = [];
    this.appSettings = {};

    this.log('info', 'JSON storage closed');
  }

  // ==================== Scheduled Events ====================

  /**
   * Load scheduled events from JSON file
   */
  private async loadScheduledEvents(): Promise<void> {
    const filePath = path.join(this.storagePath, 'scheduled-events.json');
    try {
      if (await fs.pathExists(filePath)) {
        this.scheduledEvents = await fs.readJson(filePath);
      } else {
        this.scheduledEvents = [];
        await this.saveScheduledEvents();
      }
    } catch (error) {
      this.log('error', 'Error loading scheduled events:', error);
      this.scheduledEvents = [];
    }
  }

  /**
   * Save scheduled events to JSON file
   */
  private async saveScheduledEvents(): Promise<void> {
    const filePath = path.join(this.storagePath, 'scheduled-events.json');
    await fs.writeJson(filePath, this.scheduledEvents, { spaces: 2 });
  }

  /**
   * Get all scheduled events
   */
  public async getAllScheduledEvents(): Promise<ScheduledEvent[]> {
    this.ensureInitialized();
    return [...this.scheduledEvents];
  }

  /**
   * Get scheduled event by ID
   */
  public async getScheduledEventById(id: string): Promise<ScheduledEvent | null> {
    this.ensureInitialized();
    return this.scheduledEvents.find(e => e.id === id) || null;
  }

  /**
   * Create a new scheduled event
   */
  public async createScheduledEvent(event: Partial<ScheduledEvent>): Promise<ScheduledEvent> {
    this.ensureInitialized();

    const newEvent: ScheduledEvent = {
      id: Date.now().toString(),
      title: event.title || 'Untitled Event',
      startTime: event.startTime || new Date().toISOString(),
      type: event.type || 'other',
      description: event.description,
      endTime: event.endTime,
      actions: event.actions || [],
      repeat: event.repeat,
      reminders: event.reminders,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scheduledEvents.push(newEvent);
    await this.saveScheduledEvents();

    this.log('info', `Created scheduled event: ${newEvent.id}`);
    return newEvent;
  }

  /**
   * Update an existing scheduled event
   */
  public async updateScheduledEvent(event: Partial<ScheduledEvent> & { id: string }): Promise<ScheduledEvent | null> {
    this.ensureInitialized();

    const index = this.scheduledEvents.findIndex(e => e.id === event.id);
    if (index !== -1) {
      this.scheduledEvents[index] = {
        ...this.scheduledEvents[index],
        ...event,
        updatedAt: new Date().toISOString()
      };
      await this.saveScheduledEvents();
      this.log('info', `Updated scheduled event: ${event.id}`);
      return this.scheduledEvents[index];
    }

    this.log('warn', `Scheduled event not found: ${event.id}`);
    return null;
  }

  /**
   * Delete a scheduled event
   */
  public async deleteScheduledEvent(id: string): Promise<boolean> {
    this.ensureInitialized();

    const initialLength = this.scheduledEvents.length;
    this.scheduledEvents = this.scheduledEvents.filter(e => e.id !== id);

    if (this.scheduledEvents.length < initialLength) {
      await this.saveScheduledEvents();
      this.log('info', `Deleted scheduled event: ${id}`);
      return true;
    }

    this.log('warn', `Scheduled event not found: ${id}`);
    return false;
  }

  /**
   * Get today's events
   */
  public async getTodayEvents(): Promise<ScheduledEvent[]> {
    this.ensureInitialized();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.scheduledEvents.filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });
  }

  /**
   * Get upcoming events within specified hours
   */
  public async getUpcomingEvents(hours: number = 24): Promise<ScheduledEvent[]> {
    this.ensureInitialized();
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.scheduledEvents.filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate >= now && eventDate <= futureTime;
    });
  }

  // ==================== Macros ====================

  /**
   * Load macros from JSON file
   */
  private async loadMacros(): Promise<void> {
    const filePath = path.join(this.storagePath, 'macros.json');
    try {
      if (await fs.pathExists(filePath)) {
        this.macros = await fs.readJson(filePath);
      } else {
        this.macros = [];
        await this.saveMacros();
      }
    } catch (error) {
      this.log('error', 'Error loading macros:', error);
      this.macros = [];
    }
  }

  /**
   * Save macros to JSON file
   */
  private async saveMacros(): Promise<void> {
    const filePath = path.join(this.storagePath, 'macros.json');
    await fs.writeJson(filePath, this.macros, { spaces: 2 });
  }

  /**
   * Get all macros
   */
  public async getAllMacros(): Promise<Macro[]> {
    this.ensureInitialized();
    return [...this.macros];
  }

  /**
   * Get macro by ID
   */
  public async getMacroById(id: string): Promise<Macro | null> {
    this.ensureInitialized();
    return this.macros.find(m => m.id === id) || null;
  }

  /**
   * Create a new macro
   */
  public async createMacro(macro: Partial<Macro>): Promise<Macro> {
    this.ensureInitialized();

    const newMacro: Macro = {
      id: Date.now().toString(),
      name: macro.name || 'Untitled Macro',
      description: macro.description,
      actions: macro.actions || [],
      hotkey: macro.hotkey,
      enabled: macro.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.macros.push(newMacro);
    await this.saveMacros();

    this.log('info', `Created macro: ${newMacro.id}`);
    return newMacro;
  }

  /**
   * Update an existing macro
   */
  public async updateMacro(macro: Partial<Macro> & { id: string }): Promise<Macro | null> {
    this.ensureInitialized();

    const index = this.macros.findIndex(m => m.id === macro.id);
    if (index !== -1) {
      this.macros[index] = {
        ...this.macros[index],
        ...macro,
        updatedAt: new Date().toISOString()
      };
      await this.saveMacros();
      this.log('info', `Updated macro: ${macro.id}`);
      return this.macros[index];
    }

    this.log('warn', `Macro not found: ${macro.id}`);
    return null;
  }

  /**
   * Delete a macro
   */
  public async deleteMacro(id: string): Promise<boolean> {
    this.ensureInitialized();

    const initialLength = this.macros.length;
    this.macros = this.macros.filter(m => m.id !== id);

    if (this.macros.length < initialLength) {
      await this.saveMacros();
      this.log('info', `Deleted macro: ${id}`);
      return true;
    }

    this.log('warn', `Macro not found: ${id}`);
    return false;
  }

  // ==================== Google Drive Sync ====================

  /**
   * Load Google Drive sync config from JSON file
   */
  private async loadGDriveSyncConfig(): Promise<void> {
    const filePath = path.join(this.storagePath, 'gdrive-sync.json');
    try {
      if (await fs.pathExists(filePath)) {
        this.gdriveSyncConfig = await fs.readJson(filePath);
      } else {
        this.gdriveSyncConfig = [];
        await this.saveGDriveSyncConfig();
      }
    } catch (error) {
      this.log('error', 'Error loading GDrive sync config:', error);
      this.gdriveSyncConfig = [];
    }
  }

  /**
   * Save Google Drive sync config to JSON file
   */
  private async saveGDriveSyncConfig(): Promise<void> {
    const filePath = path.join(this.storagePath, 'gdrive-sync.json');
    await fs.writeJson(filePath, this.gdriveSyncConfig, { spaces: 2 });
  }

  /**
   * Get Google Drive sync configuration
   */
  public async getGDriveSyncConfig(): Promise<GDriveSyncConfig[]> {
    this.ensureInitialized();
    return [...this.gdriveSyncConfig];
  }

  /**
   * Add or update Google Drive sync folder
   */
  public async addGDriveSyncFolder(folderId: string, localPath: string): Promise<GDriveSyncConfig[]> {
    this.ensureInitialized();

    const existing = this.gdriveSyncConfig.find(c => c.folder_id === folderId);
    if (existing) {
      existing.local_path = localPath;
      existing.last_sync = new Date().toISOString();
    } else {
      this.gdriveSyncConfig.push({
        id: Date.now(),
        folder_id: folderId,
        local_path: localPath,
        last_sync: null,
        enabled: true
      });
    }

    await this.saveGDriveSyncConfig();
    this.log('info', `Added/updated GDrive sync folder: ${folderId}`);
    return this.gdriveSyncConfig;
  }

  /**
   * Update Google Drive sync status
   */
  public async updateGDriveSyncStatus(folderId: string, lastSync: string): Promise<boolean> {
    this.ensureInitialized();

    const config = this.gdriveSyncConfig.find(c => c.folder_id === folderId);
    if (config) {
      config.last_sync = lastSync;
      await this.saveGDriveSyncConfig();
      return true;
    }
    return false;
  }

  /**
   * Remove Google Drive sync folder
   */
  public async removeGDriveSyncFolder(folderId: string): Promise<boolean> {
    this.ensureInitialized();

    const initialLength = this.gdriveSyncConfig.length;
    this.gdriveSyncConfig = this.gdriveSyncConfig.filter(c => c.folder_id !== folderId);

    if (this.gdriveSyncConfig.length < initialLength) {
      await this.saveGDriveSyncConfig();
      this.log('info', `Removed GDrive sync folder: ${folderId}`);
      return true;
    }
    return false;
  }

  // ==================== App Settings ====================

  /**
   * Load app settings from JSON file
   */
  private async loadAppSettings(): Promise<void> {
    const filePath = path.join(this.storagePath, 'settings.json');
    try {
      if (await fs.pathExists(filePath)) {
        this.appSettings = await fs.readJson(filePath);
      } else {
        this.appSettings = {};
        await this.saveAppSettings();
      }
    } catch (error) {
      this.log('error', 'Error loading app settings:', error);
      this.appSettings = {};
    }
  }

  /**
   * Save app settings to JSON file
   */
  private async saveAppSettings(): Promise<void> {
    const filePath = path.join(this.storagePath, 'settings.json');
    await fs.writeJson(filePath, this.appSettings, { spaces: 2 });
  }

  /**
   * Get a setting value
   */
  public async getSetting(key: string): Promise<any> {
    this.ensureInitialized();
    return this.appSettings[key];
  }

  /**
   * Set a setting value
   */
  public async setSetting(key: string, value: any): Promise<any> {
    this.ensureInitialized();
    this.appSettings[key] = value;
    await this.saveAppSettings();
    this.log('debug', `Setting saved: ${key}`);
    return value;
  }

  /**
   * Get all settings
   */
  public async getAllSettings(): Promise<Record<string, any>> {
    this.ensureInitialized();
    return { ...this.appSettings };
  }

  // ==================== YouTube Links ====================

  /**
   * Add YouTube link to presentation
   */
  public async addYouTubeLink(presentationPath: string, url: string): Promise<YouTubeLink> {
    const youtubePath = path.join(presentationPath, 'youtube.txt');
    try {
      let content = '';
      if (await fs.pathExists(youtubePath)) {
        content = await fs.readFile(youtubePath, 'utf8');
      }

      // Add URL if not already present
      const urls = content.split('\n').filter(line => line.trim());
      if (!urls.includes(url)) {
        urls.push(url);
        await fs.writeFile(youtubePath, urls.join('\n') + '\n');
      }

      return { id: Date.now(), url, presentation_path: presentationPath };
    } catch (error) {
      this.handleError(`addYouTubeLink(${presentationPath}, ${url})`, error);
    }
  }

  /**
   * Get YouTube links for presentation
   */
  public async getYouTubeLinks(presentationPath: string): Promise<YouTubeLink[]> {
    const youtubePath = path.join(presentationPath, 'youtube.txt');
    try {
      if (await fs.pathExists(youtubePath)) {
        const content = await fs.readFile(youtubePath, 'utf8');
        const urls = content.split('\n').filter(line => line.trim());
        return urls.map((url, index) => ({
          id: index,
          url,
          presentation_path: presentationPath
        }));
      }
      return [];
    } catch (error) {
      this.log('error', `Error reading YouTube links from ${presentationPath}:`, error);
      return [];
    }
  }

  /**
   * Delete YouTube link from presentation
   */
  public async deleteYouTubeLink(presentationPath: string, url: string): Promise<boolean> {
    const youtubePath = path.join(presentationPath, 'youtube.txt');
    try {
      if (await fs.pathExists(youtubePath)) {
        const content = await fs.readFile(youtubePath, 'utf8');
        const urls = content.split('\n').filter(line => line.trim() && line !== url);
        await fs.writeFile(youtubePath, urls.join('\n') + '\n');
        return true;
      }
      return false;
    } catch (error) {
      this.log('error', `Error deleting YouTube link from ${presentationPath}:`, error);
      return false;
    }
  }

  // ==================== Song/Presentation Metadata ====================

  /**
   * Get song metadata
   */
  public async getSongMetadata(songPath: string): Promise<SongMetadata | null> {
    const metadataPath = path.join(songPath, 'harmonysync.json');
    try {
      if (await fs.pathExists(metadataPath)) {
        return await fs.readJson(metadataPath);
      }
      return null;
    } catch (error) {
      this.log('error', `Error reading song metadata from ${songPath}:`, error);
      return null;
    }
  }

  /**
   * Save song metadata
   */
  public async saveSongMetadata(songPath: string, metadata: SongMetadata): Promise<boolean> {
    const metadataPath = path.join(songPath, 'harmonysync.json');
    try {
      await fs.writeJson(metadataPath, {
        ...metadata,
        updated_at: new Date().toISOString()
      }, { spaces: 2 });
      return true;
    } catch (error) {
      this.log('error', `Error saving song metadata to ${songPath}:`, error);
      return false;
    }
  }

  /**
   * Get storage path
   */
  public getStoragePath(): string {
    return this.storagePath;
  }
}

// Export singleton instance
let storageInstance: JSONStorageService | null = null;

/**
 * Get or create the JSON storage service singleton
 */
export function getJSONStorageService(config?: ServiceConfig): JSONStorageService {
  if (!storageInstance) {
    storageInstance = new JSONStorageService(config);
  }
  return storageInstance;
}

// Export for backward compatibility
export default JSONStorageService;
