/**
 * Display ViewModel - Presentation logic for display settings
 * 
 * This ViewModel manages the state and business logic for display configurations.
 * It uses MobX for reactive state management and delegates operations to DisplayService and FileService.
 * 
 * Key responsibilities:
 * - Manage display configurations (audience, confidence, lower thirds, NDI, etc.)
 * - Handle CRUD operations for display configs
 * - Manage legacy font settings
 * - Handle available displays/screens detection
 * - Persist settings to file system
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */

import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { IDisplayViewModel } from '../types/viewmodels';
import type { Display, DisplayWindow } from '../types';

// Service interfaces
interface IDisplayService {
  getDisplays(): Promise<Display[]>;
  openWindow(type: DisplayWindow['type'], displayId: string): Promise<void>;
  closeWindow(type: DisplayWindow['type']): Promise<void>;
  getWindowConfig(type: DisplayWindow['type']): Promise<DisplayWindow | null>;
  setWindowBounds(
    type: DisplayWindow['type'],
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void>;
}

interface IFileService {
  readTextFile(filePath: string): Promise<string>;
  writeTextFile(filePath: string, content: string): Promise<void>;
}

interface IIpcService {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

interface DisplayConfig {
  id: string;
  name: string;
  type: string;
  order: number;
  enabled: boolean;
  deviceId?: string;
  ndiOutput?: string;
}

export class DisplayViewModel extends BaseViewModel implements IDisplayViewModel {
  protected readonly viewModelName = 'DisplayViewModel';

  // Observable state
  public displays: Display[] = [];
  public displayConfigs: DisplayConfig[] = [];
  public availableDisplays: Array<{ id: string; name: string }> = [];
  public windows: Map<string, DisplayWindow> = new Map();
  public selectedDisplayId: string | null = null;
  public isLoading: boolean = false;
  public error: string | null = null;

  // Legacy font settings
  public audienceFontSize: string = '72';
  public confidenceFontSize: string = '72';
  public audienceFontFamily: string = 'Arial';
  public confidenceFontFamily: string = 'Arial';

  // UI state
  public editingDisplay: DisplayConfig | null = null;
  public showAddForm: boolean = false;

  // Constants
  public readonly fontOptions: string[] = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Courier New',
    'Lucida Console',
    'Impact',
    'Comic Sans MS',
    'Palatino',
    'Garamond',
    'Bookman',
    'Avant Garde',
  ];

  public readonly PREVIEW_SCALE_FACTOR = 3;
  public readonly PREVIEW_MAX_SIZE = 48;

  // Services
  private displayService: IDisplayService;
  private fileService: IFileService;
  private ipcService: IIpcService;

  constructor(displayService: IDisplayService, fileService: IFileService, ipcService: IIpcService) {
    super();
    this.displayService = displayService;
    this.fileService = fileService;
    this.ipcService = ipcService;

    makeObservable(this, {
      displays: observable,
      displayConfigs: observable,
      availableDisplays: observable,
      windows: observable,
      selectedDisplayId: observable,
      isLoading: observable,
      error: observable,
      audienceFontSize: observable,
      confidenceFontSize: observable,
      audienceFontFamily: observable,
      confidenceFontFamily: observable,
      editingDisplay: observable,
      showAddForm: observable,
      hasDisplays: computed,
      sortedDisplays: computed,
      audiencePreviewFontSize: computed,
      confidencePreviewFontSize: computed,
      primaryDisplay: computed,
      secondaryDisplays: computed,
      openWindows: computed,
      loadDisplayConfigs: action,
      loadLegacySettings: action,
      loadAvailableDisplays: action,
      saveSettings: action,
      addDisplay: action,
      updateDisplay: action,
      deleteDisplay: action,
      toggleDisplayEnabled: action,
      openAddForm: action,
      closeAddForm: action,
      startEditing: action,
      cancelEditing: action,
      setAudienceFontSize: action,
      setConfidenceFontSize: action,
      setAudienceFontFamily: action,
      setConfidenceFontFamily: action,
      loadDisplays: action,
      openAudienceWindow: action,
      openConfidenceWindow: action,
      openLowerThirdsWindow: action,
      openPreserviceWindow: action,
      closeWindow: action,
      setWindowBounds: action,
      selectDisplay: action,
    });
  }

  /**
   * Initialize ViewModel
   */
  protected override async onInitialize(): Promise<void> {
    await Promise.all([
      this.loadDisplayConfigs(),
      this.loadLegacySettings(),
      this.loadAvailableDisplays(),
    ]);
  }

  // Computed properties
  public get hasDisplays(): boolean {
    return this.displayConfigs.length > 0;
  }

  public get sortedDisplays(): DisplayConfig[] {
    return [...this.displayConfigs].sort((a, b) => a.order - b.order);
  }

  public get audiencePreviewFontSize(): number {
    return Math.min(parseInt(this.audienceFontSize) / this.PREVIEW_SCALE_FACTOR, this.PREVIEW_MAX_SIZE);
  }

  public get confidencePreviewFontSize(): number {
    return Math.min(parseInt(this.confidenceFontSize) / this.PREVIEW_SCALE_FACTOR, this.PREVIEW_MAX_SIZE);
  }

  public get primaryDisplay(): Display | null {
    return this.displays.find(d => d.isPrimary) || null;
  }

  public get secondaryDisplays(): Display[] {
    return this.displays.filter(d => !d.isPrimary);
  }

  public get openWindows(): DisplayWindow[] {
    return Array.from(this.windows.values());
  }

  // Actions: Load display configurations
  public async loadDisplayConfigs(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const configs = (await this.ipcService.invoke('displayConfig:getAll')) as DisplayConfig[];

      runInAction(() => {
        this.displayConfigs = configs || [];
        this.isLoading = false;
      });
    } catch (error) {
      this.handleError('Load display configs', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }

  // Actions: Load legacy font settings from file
  public async loadLegacySettings(): Promise<void> {
    try {
      const settingsDir = (await this.ipcService.invoke('settings:getSettingsPath')) as string;
      const settingsPath = `${settingsDir}/display_settings.json`;

      try {
        const settingsContent = await this.fileService.readTextFile(settingsPath);
        const settings = JSON.parse(settingsContent) as {
          audienceFontSize?: string;
          confidenceFontSize?: string;
          audienceFontFamily?: string;
          confidenceFontFamily?: string;
        };

        runInAction(() => {
          this.audienceFontSize = settings.audienceFontSize || '72';
          this.confidenceFontSize = settings.confidenceFontSize || '72';
          this.audienceFontFamily = settings.audienceFontFamily || 'Arial';
          this.confidenceFontFamily = settings.confidenceFontFamily || 'Arial';
        });
      } catch (readError) {
        // File doesn't exist yet, use defaults
        this.log('No display settings file found, using defaults');
      }
    } catch (error) {
      this.logError('Error loading legacy settings:', error);
    }
  }

  // Actions: Load available displays/screens
  public async loadAvailableDisplays(): Promise<void> {
    try {
      const displays = (await this.ipcService.invoke('settings:getDisplays')) as Array<{
        id: string;
        name: string;
      }>;

      runInAction(() => {
        this.availableDisplays = displays || [];
      });
    } catch (error) {
      this.logError('Error loading available displays:', error);

      // Fallback to basic display list if command fails
      runInAction(() => {
        this.availableDisplays = [
          { id: 'primary', name: 'Primary Display' },
          { id: 'secondary', name: 'Secondary Display' },
        ];
      });
    }
  }

  // Actions: Save all settings
  public async saveSettings(): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      // Save legacy font settings
      const settingsDir = (await this.ipcService.invoke('settings:getSettingsPath')) as string;
      const settingsPath = `${settingsDir}/display_settings.json`;

      const settings = {
        audienceFontSize: this.audienceFontSize,
        confidenceFontSize: this.confidenceFontSize,
        audienceFontFamily: this.audienceFontFamily,
        confidenceFontFamily: this.confidenceFontFamily,
      };

      await this.fileService.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

      runInAction(() => {
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Save settings', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  // Actions: CRUD operations for display configs
  public async addDisplay(displayData: Partial<DisplayConfig>): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      await this.ipcService.invoke('displayConfig:create', { config: displayData });
      await this.loadDisplayConfigs();

      runInAction(() => {
        this.showAddForm = false;
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Add display', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  public async updateDisplay(id: string, updates: Partial<DisplayConfig>): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      await this.ipcService.invoke('displayConfig:update', { id, updates });
      await this.loadDisplayConfigs();

      runInAction(() => {
        this.editingDisplay = null;
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Update display', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  public async deleteDisplay(id: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      await this.ipcService.invoke('displayConfig:delete', { id });
      await this.loadDisplayConfigs();

      runInAction(() => {
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Delete display', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  public async toggleDisplayEnabled(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.ipcService.invoke('displayConfig:update', { id, updates: { enabled } });
      await this.loadDisplayConfigs();
      return true;
    } catch (error) {
      this.handleError('Toggle display', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
      return false;
    }
  }

  // Actions: UI state management
  public openAddForm(): void {
    this.showAddForm = true;
  }

  public closeAddForm(): void {
    this.showAddForm = false;
  }

  public startEditing(display: DisplayConfig): void {
    this.editingDisplay = display;
  }

  public cancelEditing(): void {
    this.editingDisplay = null;
    this.showAddForm = false;
  }

  // Actions: Font settings
  public setAudienceFontSize(size: string): void {
    const numSize = parseInt(size);
    if (numSize >= 24 && numSize <= 200) {
      this.audienceFontSize = size;
    }
  }

  public setConfidenceFontSize(size: string): void {
    const numSize = parseInt(size);
    if (numSize >= 24 && numSize <= 200) {
      this.confidenceFontSize = size;
    }
  }

  public setAudienceFontFamily(family: string): void {
    if (this.fontOptions.includes(family)) {
      this.audienceFontFamily = family;
    }
  }

  public setConfidenceFontFamily(family: string): void {
    if (this.fontOptions.includes(family)) {
      this.confidenceFontFamily = family;
    }
  }

  // Utility: Get display name by ID
  public getDisplayNameById(deviceId: string): string {
    const display = this.availableDisplays.find(d => d.id === deviceId);
    return display ? display.name : deviceId;
  }

  // Utility: Get output description for display config
  public getOutputDescription(config: DisplayConfig): string {
    if (config.deviceId) {
      return `Device: ${this.getDisplayNameById(config.deviceId)}`;
    } else if (config.ndiOutput) {
      return `NDI: ${config.ndiOutput}`;
    }
    return 'Auto';
  }

  // Interface method implementations
  public async loadDisplays(): Promise<void> {
    try {
      const displays = await this.displayService.getDisplays();
      runInAction(() => {
        this.displays = displays;
      });
    } catch (error) {
      this.handleError('Load displays', error);
    }
  }

  public async openAudienceWindow(displayId: string): Promise<void> {
    try {
      await this.displayService.openWindow('audience', displayId);
      const window = await this.displayService.getWindowConfig('audience');
      if (window) {
        runInAction(() => {
          this.windows.set('audience', window);
        });
      }
    } catch (error) {
      this.handleError('Open audience window', error);
    }
  }

  public async openConfidenceWindow(displayId: string): Promise<void> {
    try {
      await this.displayService.openWindow('confidence', displayId);
      const window = await this.displayService.getWindowConfig('confidence');
      if (window) {
        runInAction(() => {
          this.windows.set('confidence', window);
        });
      }
    } catch (error) {
      this.handleError('Open confidence window', error);
    }
  }

  public async openLowerThirdsWindow(displayId: string): Promise<void> {
    try {
      await this.displayService.openWindow('lowerthirds', displayId);
      const window = await this.displayService.getWindowConfig('lowerthirds');
      if (window) {
        runInAction(() => {
          this.windows.set('lowerthirds', window);
        });
      }
    } catch (error) {
      this.handleError('Open lower thirds window', error);
    }
  }

  public async openPreserviceWindow(displayId: string): Promise<void> {
    try {
      await this.displayService.openWindow('preservice-music', displayId);
      const window = await this.displayService.getWindowConfig('preservice-music');
      if (window) {
        runInAction(() => {
          this.windows.set('preservice-music', window);
        });
      }
    } catch (error) {
      this.handleError('Open preservice window', error);
    }
  }

  public async closeWindow(type: DisplayWindow['type']): Promise<void> {
    try {
      await this.displayService.closeWindow(type);
      runInAction(() => {
        this.windows.delete(type);
      });
    } catch (error) {
      this.handleError('Close window', error);
    }
  }

  public async setWindowBounds(
    type: DisplayWindow['type'],
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    try {
      await this.displayService.setWindowBounds(type, bounds);
      const window = this.windows.get(type);
      if (window) {
        runInAction(() => {
          window.bounds = bounds;
        });
      }
    } catch (error) {
      this.handleError('Set window bounds', error);
    }
  }

  public selectDisplay(displayId: string): void {
    this.selectedDisplayId = displayId;
  }

  /**
   * Handle errors and update error state
   */
  protected override onError(operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default DisplayViewModel;
