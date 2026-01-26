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
import { makeAutoObservable, runInAction } from 'mobx';

class DisplayViewModel {
  // Observable state
  displayConfigs = [];
  availableDisplays = [];
  isLoading = false;
  error = null;
  
  // Legacy font settings
  audienceFontSize = '72';
  confidenceFontSize = '72';
  audienceFontFamily = 'Arial';
  confidenceFontFamily = 'Arial';

  // UI state
  editingDisplay = null;
  showAddForm = false;

  // Constants
  fontOptions = [
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
    'Avant Garde'
  ];

  PREVIEW_SCALE_FACTOR = 3;
  PREVIEW_MAX_SIZE = 48;

  constructor(displayService, fileService, ipcService) {
    this.displayService = displayService;
    this.fileService = fileService;
    this.ipcService = ipcService;
    makeAutoObservable(this);
  }

  // Computed properties
  get hasDisplays() {
    return this.displayConfigs.length > 0;
  }

  get sortedDisplays() {
    return [...this.displayConfigs].sort((a, b) => a.order - b.order);
  }

  get audiencePreviewFontSize() {
    return Math.min(
      parseInt(this.audienceFontSize) / this.PREVIEW_SCALE_FACTOR,
      this.PREVIEW_MAX_SIZE
    );
  }

  get confidencePreviewFontSize() {
    return Math.min(
      parseInt(this.confidenceFontSize) / this.PREVIEW_SCALE_FACTOR,
      this.PREVIEW_MAX_SIZE
    );
  }

  // Actions: Initialize
  async initialize() {
    await Promise.all([
      this.loadDisplayConfigs(),
      this.loadLegacySettings(),
      this.loadAvailableDisplays()
    ]);
  }

  // Actions: Load display configurations
  async loadDisplayConfigs() {
    this.isLoading = true;
    this.error = null;

    try {
      const configs = await this.ipcService.invoke('displayConfig:getAll');
      
      runInAction(() => {
        this.displayConfigs = configs || [];
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error loading display configs:', error);
    }
  }

  // Actions: Load legacy font settings from file
  async loadLegacySettings() {
    try {
      const settingsDir = await this.ipcService.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/display_settings.json`;
      
      try {
        const settingsContent = await this.fileService.readTextFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        
        runInAction(() => {
          this.audienceFontSize = settings.audienceFontSize || '72';
          this.confidenceFontSize = settings.confidenceFontSize || '72';
          this.audienceFontFamily = settings.audienceFontFamily || 'Arial';
          this.confidenceFontFamily = settings.confidenceFontFamily || 'Arial';
        });
      } catch (readError) {
        // File doesn't exist yet, use defaults
        console.log('No display settings file found, using defaults');
      }
    } catch (error) {
      console.error('Error loading legacy settings:', error);
    }
  }

  // Actions: Load available displays/screens
  async loadAvailableDisplays() {
    try {
      const displays = await this.ipcService.invoke('settings:getDisplays');
      
      runInAction(() => {
        this.availableDisplays = displays || [];
      });
    } catch (error) {
      console.error('Error loading available displays:', error);
      
      // Fallback to basic display list if command fails
      runInAction(() => {
        this.availableDisplays = [
          { id: 'primary', name: 'Primary Display' },
          { id: 'secondary', name: 'Secondary Display' }
        ];
      });
    }
  }

  // Actions: Save all settings
  async saveSettings() {
    this.isLoading = true;
    this.error = null;

    try {
      // Save legacy font settings
      const settingsDir = await this.ipcService.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/display_settings.json`;
      
      const settings = {
        audienceFontSize: this.audienceFontSize,
        confidenceFontSize: this.confidenceFontSize,
        audienceFontFamily: this.audienceFontFamily,
        confidenceFontFamily: this.confidenceFontFamily
      };
      
      await this.fileService.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
      
      runInAction(() => {
        this.isLoading = false;
      });
      
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error saving settings:', error);
      return false;
    }
  }

  // Actions: CRUD operations for display configs
  async addDisplay(displayData) {
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
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error adding display:', error);
      return false;
    }
  }

  async updateDisplay(id, updates) {
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
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error updating display:', error);
      return false;
    }
  }

  async deleteDisplay(id) {
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
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error deleting display:', error);
      return false;
    }
  }

  async toggleDisplayEnabled(id, enabled) {
    try {
      await this.ipcService.invoke('displayConfig:update', { id, updates: { enabled } });
      await this.loadDisplayConfigs();
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Error toggling display:', error);
      return false;
    }
  }

  // Actions: UI state management
  openAddForm() {
    this.showAddForm = true;
  }

  closeAddForm() {
    this.showAddForm = false;
  }

  startEditing(display) {
    this.editingDisplay = display;
  }

  cancelEditing() {
    this.editingDisplay = null;
    this.showAddForm = false;
  }

  // Actions: Font settings
  setAudienceFontSize(size) {
    const numSize = parseInt(size);
    if (numSize >= 24 && numSize <= 200) {
      this.audienceFontSize = size;
    }
  }

  setConfidenceFontSize(size) {
    const numSize = parseInt(size);
    if (numSize >= 24 && numSize <= 200) {
      this.confidenceFontSize = size;
    }
  }

  setAudienceFontFamily(family) {
    if (this.fontOptions.includes(family)) {
      this.audienceFontFamily = family;
    }
  }

  setConfidenceFontFamily(family) {
    if (this.fontOptions.includes(family)) {
      this.confidenceFontFamily = family;
    }
  }

  // Utility: Get display name by ID
  getDisplayNameById(deviceId) {
    const display = this.availableDisplays.find(d => d.id === deviceId);
    return display ? display.name : deviceId;
  }

  // Utility: Get output description for display config
  getOutputDescription(config) {
    if (config.deviceId) {
      return `Device: ${this.getDisplayNameById(config.deviceId)}`;
    } else if (config.ndiOutput) {
      return `NDI: ${config.ndiOutput}`;
    }
    return 'Auto';
  }

  // Cleanup
  dispose() {
    this.displayConfigs = [];
    this.availableDisplays = [];
    this.editingDisplay = null;
    this.showAddForm = false;
  }
}

export default DisplayViewModel;
