import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

console.log('[Preload] ============================================');
console.log('[Preload] Preload script executing...');
console.log('[Preload] contextBridge available:', typeof contextBridge);
console.log('[Preload] ipcRenderer available:', typeof ipcRenderer);
console.log('[Preload] ============================================');

/**
 * Electron API Interface
 * Defines the shape of the API exposed to the renderer process
 */
interface ElectronAPI {
  // Generic IPC invoke method for any channel
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;

  // File operations
  openDirectory: (options?: { multiple?: boolean }) => Promise<string[]>;
  openFile: (filters?: Electron.FileFilter[]) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readDir: (path: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;

  // Audio file operations
  readAudioFile: (path: string) => Promise<ArrayBuffer>;
  getAudioFiles: (folderPath: string) => Promise<string[]>;

  // Database operations
  dbQuery: (query: string, params?: any[]) => Promise<any[]>;
  dbRun: (query: string, params?: any[]) => Promise<any>;
  dbGet: (query: string, params?: any[]) => Promise<any>;
  dbAll: (query: string, params?: any[]) => Promise<any[]>;

  // FFmpeg operations
  convertToOgg: (inputPath: string, outputDir: string) => Promise<string>;
  transposeAudio: (songPath: string, semitones: number) => Promise<string>;
  getVideoMetadata: (path: string) => Promise<any>;
  transcodeVideo: (inputPath: string) => Promise<string>;
  generateThumbnail: (videoPath: string) => Promise<string>;

  // Window operations
  showAudienceWindow: () => Promise<void>;
  hideAudienceWindow: () => Promise<void>;
  showConfidenceWindow: () => Promise<void>;
  hideConfidenceWindow: () => Promise<void>;
  showLowerThirdsWindow: () => Promise<void>;
  hideLowerThirdsWindow: () => Promise<void>;
  openPreserviceMusicWindow: () => Promise<{ success: boolean }>;
  closePreserviceMusicWindow: () => Promise<{ success: boolean }>;
  openSchedulerWindow: () => Promise<{ success: boolean }>;

  // Display video/slides
  displayVideoSlide: (path: string, duration?: number) => Promise<void>;
  displaySlide: (content: any) => Promise<void>;
  displayBlackScreen: () => Promise<void>;

  // MIDI operations
  getMidiDevices: () => Promise<any[]>;
  sendMidiNote: (device: string, note: number, velocity: number, duration: number) => Promise<boolean>;

  // Lyrics fetcher
  searchLyrics: (title: string, artist: string) => Promise<any[]>;
  fetchLyrics: (songId: string) => Promise<any>;

  // Slides service
  importPdfSlides: (pdfPath: string, options?: any) => Promise<string[]>;
  importPowerpointSlides: (pptxPath: string, options?: any) => Promise<string[]>;
  createTextSlide: (text: string, style: any, backgroundImage?: string) => Promise<string>;
  importSlidesFromFolder: (folderPath: string, options?: any) => Promise<string[]>;
  importSlidesFromZip: (zipPath: string, options?: any) => Promise<string[]>;
  scanServiceFolder: (servicePath: string) => Promise<any>;
  validateSlideFile: (filePath: string) => Promise<boolean>;
  getSlideMetadata: (filePath: string) => Promise<any>;

  // Google Drive integration
  googleDriveAuth: () => Promise<boolean>;
  googleDriveListFiles: (folderId?: string) => Promise<any[]>;
  googleDriveDownloadFile: (fileId: string, destination: string) => Promise<void>;
  googleDriveSyncFolder: (folderId: string, localPath: string) => Promise<void>;

  // HTTP Server
  getHttpServerUrl: () => Promise<string>;

  // Background CSS generation
  generateBackgroundCss: (path: string) => Promise<string>;

  // Settings
  getDisplays: () => Promise<any[]>;
  getAudioDevices: () => Promise<any[]>;
  getSettingsPath: () => Promise<string>;

  // Display Configuration
  displayConfigGetAll: () => Promise<any[]>;
  displayConfigGet: (id: string) => Promise<any>;
  displayConfigCreate: (config: any) => Promise<string>;
  displayConfigUpdate: (id: string, updates: any) => Promise<void>;
  displayConfigDelete: (id: string) => Promise<void>;
  displayConfigReorder: (orderedIds: string[]) => Promise<void>;
  displayConfigGetEnabled: () => Promise<any[]>;

  // Event listeners
  onDisplaySettingsClicked: (callback: () => void) => () => void;
  onAudioSettingsClicked: (callback: () => void) => () => void;
  onOggConversionProgress: (callback: (data: any) => void) => () => void;
  onVideoTranscodeProgress: (callback: (data: any) => void) => () => void;
  onTracksUpdated: (callback: (data: any) => void) => () => void;
  onVideoEnded: (callback: () => void) => () => void;
  onSlidesImportProgress: (callback: (data: any) => void) => () => void;
  onServiceOrderLoaded: (callback: (event: any, data: any) => void) => () => void;

  // Service Order Import
  serviceOrderScanForZips: (folderPath: string) => Promise<any>;
  serviceOrderImportZip: (zipPath: string) => Promise<any>;
  serviceOrderListImported: () => Promise<any>;
  serviceOrderLoad: (serviceId: string) => Promise<any>;
  serviceOrderGetService: (serviceId: string) => Promise<any>;
  serviceOrderDeleteService: (serviceId: string) => Promise<any>;
  serviceOrderCleanup: (maxAgeDays?: number) => Promise<any>;
  serviceOrderCreateConfigTemplate: (itemPath: string, overwrite?: boolean) => Promise<any>;
  serviceOrderGetConfigTemplate: () => Promise<any>;

  // App Settings
  settingsGet: () => Promise<any>;
  settingsSave: (settings: any) => Promise<any>;
  settingsGetServiceOrder: () => Promise<any>;
  settingsUpdateServiceOrder: (updates: any) => Promise<any>;
  settingsReset: () => Promise<any>;

  // Send to specific window
  sendToAudience: (channel: string, data: any) => Promise<void>;
  sendToConfidence: (channel: string, data: any) => Promise<void>;
  sendToLowerThirds: (channel: string, data: any) => Promise<void>;

  // Send event to main process
  send: (channel: string, ...args: any[]) => void;

  // Send to main window
  sendToMain: (channel: string, data: any) => Promise<void>;

  // Receive from main process
  receive: (channel: string, callback: (...args: any[]) => void) => () => void;

  // Canva integration
  canvaImportSlides: (options: any) => Promise<any>;
}

/**
 * Platform Information Interface
 */
interface PlatformInfo {
  os: string;
  arch: string;
  version: string;
}

/**
 * API Builder Class
 * Constructs the electron API with type-safe methods
 */
class ElectronAPIBuilder {
  /**
   * Build the complete Electron API
   */
  public static build(): ElectronAPI {
    return {
      // Generic IPC invoke method
      invoke: (channel: string, ...args: unknown[]) => {
        console.log('[Preload] invoke called on channel:', channel, 'with args:', args);
        return ipcRenderer.invoke(channel, ...args);
      },

      // File operations
      openDirectory: (options?: { multiple?: boolean }) => {
        console.log('[Preload] openDirectory invoked with options:', options);
        return ipcRenderer.invoke('dialog:openDirectory', options);
      },
      openFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:openFile', filters),
      readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
      writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
      readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
      exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
      mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
      copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copyFile', src, dest),

      // Audio file operations
      readAudioFile: (path: string) => ipcRenderer.invoke('audio:readFile', path),
      getAudioFiles: (folderPath: string) => ipcRenderer.invoke('audio:getFiles', folderPath),

      // Database operations
      dbQuery: (query: string, params?: any[]) => ipcRenderer.invoke('db:query', query, params),
      dbRun: (query: string, params?: any[]) => ipcRenderer.invoke('db:run', query, params),
      dbGet: (query: string, params?: any[]) => ipcRenderer.invoke('db:get', query, params),
      dbAll: (query: string, params?: any[]) => ipcRenderer.invoke('db:all', query, params),

      // FFmpeg operations
      convertToOgg: (inputPath: string, outputDir: string) =>
        ipcRenderer.invoke('ffmpeg:convertToOgg', inputPath, outputDir),
      transposeAudio: (songPath: string, semitones: number) =>
        ipcRenderer.invoke('ffmpeg:transposeAudio', songPath, semitones),
      getVideoMetadata: (path: string) => ipcRenderer.invoke('ffmpeg:getVideoMetadata', path),
      transcodeVideo: (inputPath: string) => ipcRenderer.invoke('ffmpeg:transcodeVideo', inputPath),
      generateThumbnail: (videoPath: string) => ipcRenderer.invoke('ffmpeg:generateThumbnail', videoPath),

      // Window operations
      showAudienceWindow: () => ipcRenderer.invoke('window:showAudience'),
      hideAudienceWindow: () => ipcRenderer.invoke('window:hideAudience'),
      showConfidenceWindow: () => ipcRenderer.invoke('window:showConfidence'),
      hideConfidenceWindow: () => ipcRenderer.invoke('window:hideConfidence'),
      showLowerThirdsWindow: () => ipcRenderer.invoke('window:showLowerThirds'),
      hideLowerThirdsWindow: () => ipcRenderer.invoke('window:hideLowerThirds'),
      openPreserviceMusicWindow: () => ipcRenderer.invoke('open_preservice_music_window'),
      closePreserviceMusicWindow: () => ipcRenderer.invoke('close_preservice_music_window'),
      openSchedulerWindow: () => ipcRenderer.invoke('open_scheduler_window'),

      // Display video/slides
      displayVideoSlide: (path: string, duration?: number) =>
        ipcRenderer.invoke('display:videoSlide', path, duration),
      displaySlide: (content: any) => ipcRenderer.invoke('display:slide', content),
      displayBlackScreen: () => ipcRenderer.invoke('display:blackScreen'),

      // MIDI operations
      getMidiDevices: () => ipcRenderer.invoke('midi:getDevices'),
      sendMidiNote: (device: string, note: number, velocity: number, duration: number) =>
        ipcRenderer.invoke('midi:sendNote', device, note, velocity, duration),

      // Lyrics fetcher
      searchLyrics: (title: string, artist: string) => ipcRenderer.invoke('lyrics:search', title, artist),
      fetchLyrics: (songId: string) => ipcRenderer.invoke('lyrics:fetch', songId),

      // Slides service
      importPdfSlides: (pdfPath: string, options?: any) =>
        ipcRenderer.invoke('slides:importPdf', pdfPath, options),
      importPowerpointSlides: (pptxPath: string, options?: any) =>
        ipcRenderer.invoke('slides:importPowerpoint', pptxPath, options),
      createTextSlide: (text: string, style: any, backgroundImage?: string) =>
        ipcRenderer.invoke('slides:createTextSlide', text, style, backgroundImage),
      importSlidesFromFolder: (folderPath: string, options?: any) =>
        ipcRenderer.invoke('slides:importFromFolder', folderPath, options),
      importSlidesFromZip: (zipPath: string, options?: any) =>
        ipcRenderer.invoke('slides:importFromZip', zipPath, options),
      scanServiceFolder: (servicePath: string) => ipcRenderer.invoke('slides:scanServiceFolder', servicePath),
      validateSlideFile: (filePath: string) => ipcRenderer.invoke('slides:validateFile', filePath),
      getSlideMetadata: (filePath: string) => ipcRenderer.invoke('slides:getMetadata', filePath),

      // Google Drive integration
      googleDriveAuth: () => ipcRenderer.invoke('gdrive:auth'),
      googleDriveListFiles: (folderId?: string) => ipcRenderer.invoke('gdrive:listFiles', folderId),
      googleDriveDownloadFile: (fileId: string, destination: string) =>
        ipcRenderer.invoke('gdrive:downloadFile', fileId, destination),
      googleDriveSyncFolder: (folderId: string, localPath: string) =>
        ipcRenderer.invoke('gdrive:syncFolder', folderId, localPath),

      // HTTP Server
      getHttpServerUrl: () => ipcRenderer.invoke('http:getServerUrl'),

      // Background CSS generation
      generateBackgroundCss: (path: string) => ipcRenderer.invoke('css:generateBackground', path),

      // Settings
      getDisplays: () => ipcRenderer.invoke('settings:getDisplays'),
      getAudioDevices: () => ipcRenderer.invoke('settings:getAudioDevices'),
      getSettingsPath: () => ipcRenderer.invoke('settings:getSettingsPath'),

      // Display Configuration
      displayConfigGetAll: () => ipcRenderer.invoke('displayConfig:getAll'),
      displayConfigGet: (id: string) => ipcRenderer.invoke('displayConfig:get', id),
      displayConfigCreate: (config: any) => ipcRenderer.invoke('displayConfig:create', config),
      displayConfigUpdate: (id: string, updates: any) =>
        ipcRenderer.invoke('displayConfig:update', id, updates),
      displayConfigDelete: (id: string) => ipcRenderer.invoke('displayConfig:delete', id),
      displayConfigReorder: (orderedIds: string[]) =>
        ipcRenderer.invoke('displayConfig:reorder', orderedIds),
      displayConfigGetEnabled: () => ipcRenderer.invoke('displayConfig:getEnabled'),

      // Service Order Import
      serviceOrderScanForZips: (folderPath: string) =>
        ipcRenderer.invoke('service-order:scanForZips', folderPath),
      serviceOrderImportZip: (zipPath: string) =>
        ipcRenderer.invoke('service-order:importZip', zipPath),
      serviceOrderListImported: () =>
        ipcRenderer.invoke('service-order:listImported'),
      serviceOrderLoad: (serviceId: string) =>
        ipcRenderer.invoke('service-order:load', serviceId),
      serviceOrderGetService: (serviceId: string) =>
        ipcRenderer.invoke('service-order:getService', serviceId),
      serviceOrderDeleteService: (serviceId: string) =>
        ipcRenderer.invoke('service-order:deleteService', serviceId),
      serviceOrderCleanup: (maxAgeDays: number = 7) =>
        ipcRenderer.invoke('service-order:cleanup', maxAgeDays),
      serviceOrderCreateConfigTemplate: (itemPath: string, overwrite: boolean = false) =>
        ipcRenderer.invoke('service-order:createConfigTemplate', itemPath, overwrite),
      serviceOrderGetConfigTemplate: () =>
        ipcRenderer.invoke('service-order:getConfigTemplate'),

      // App Settings
      settingsGet: () =>
        ipcRenderer.invoke('settings:get'),
      settingsSave: (settings: any) =>
        ipcRenderer.invoke('settings:save', settings),
      settingsGetServiceOrder: () =>
        ipcRenderer.invoke('settings:getServiceOrder'),
      settingsUpdateServiceOrder: (updates: any) =>
        ipcRenderer.invoke('settings:updateServiceOrder', updates),
      settingsReset: () =>
        ipcRenderer.invoke('settings:reset'),

      // Event listeners
      onDisplaySettingsClicked: (callback: () => void) => {
        ipcRenderer.on('display-settings-clicked', callback);
        return () => ipcRenderer.removeListener('display-settings-clicked', callback);
      },

      onAudioSettingsClicked: (callback: () => void) => {
        ipcRenderer.on('audio-settings-clicked', callback);
        return () => ipcRenderer.removeListener('audio-settings-clicked', callback);
      },

      onOggConversionProgress: (callback: (data: any) => void) => {
        ipcRenderer.on('ogg-conversion-progress', (_event: IpcRendererEvent, data: any) => callback(data));
        return () => ipcRenderer.removeAllListeners('ogg-conversion-progress');
      },

      onVideoTranscodeProgress: (callback: (data: any) => void) => {
        ipcRenderer.on('video-transcode-progress', (_event: IpcRendererEvent, data: any) => callback(data));
        return () => ipcRenderer.removeAllListeners('video-transcode-progress');
      },

      onTracksUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('tracks-updated', (_event: IpcRendererEvent, data: any) => callback(data));
        return () => ipcRenderer.removeAllListeners('tracks-updated');
      },

      onVideoEnded: (callback: () => void) => {
        ipcRenderer.on('video-ended', callback);
        return () => ipcRenderer.removeAllListeners('video-ended');
      },

      onSlidesImportProgress: (callback: (data: any) => void) => {
        ipcRenderer.on('slides-import-progress', (_event: IpcRendererEvent, data: any) => callback(data));
        return () => ipcRenderer.removeAllListeners('slides-import-progress');
      },

      onServiceOrderLoaded: (callback: (event: any, data: any) => void) => {
        ipcRenderer.on('service-order-loaded', (_event: IpcRendererEvent, data: any) => callback(_event, data));
        return () => ipcRenderer.removeAllListeners('service-order-loaded');
      },

      // Send events to main process
      send: (channel: string, ...args: any[]) => {
        ipcRenderer.send(channel, ...args);
      },

      // Send to specific window
      sendToAudience: (channel: string, data: any) => ipcRenderer.invoke('send:audience', channel, data),
      sendToConfidence: (channel: string, data: any) => ipcRenderer.invoke('send:confidence', channel, data),
      sendToLowerThirds: (channel: string, data: any) =>
        ipcRenderer.invoke('send:lowerThirds', channel, data),
      sendToMain: (channel: string, data: any) => ipcRenderer.invoke('send:main', channel, data),

      // Receive from main process
      receive: (channel: string, callback: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: any[]) => callback(...args));
        return () => ipcRenderer.removeAllListeners(channel);
      },

      // Canva integration
      canvaImportSlides: (options: any) => ipcRenderer.invoke('canva:importSlides', options),
    };
  }

  /**
   * Build platform information object
   */
  public static buildPlatformInfo(): PlatformInfo {
    return {
      os: process.platform,
      arch: process.arch,
      version: process.version,
    };
  }
}

/**
 * Context Bridge Exposer
 * Safely exposes APIs to the renderer process
 */
class ContextBridgeExposer {
  /**
   * Expose all APIs to the renderer process
   */
  public static exposeAPIs(): void {
    try {
      // Build the API
      const api = ElectronAPIBuilder.build();

      // Expose electronAPI
      contextBridge.exposeInMainWorld('electronAPI', api);
      console.log('[Preload] electronAPI successfully exposed');

      // Also expose a cached reference so renderer HMR reloads can find it immediately
      contextBridge.exposeInMainWorld('__electronAPICached', api);
      console.log('[Preload] __electronAPICached successfully exposed');

      // Platform information
      contextBridge.exposeInMainWorld('platform', ElectronAPIBuilder.buildPlatformInfo());
      console.log('[Preload] platform information successfully exposed');

      // Signal that preload is complete
      contextBridge.exposeInMainWorld('__preloadReady', true);
      console.log('[Preload] __preloadReady flag set');

      console.log('[Preload] ============================================');
      console.log('[Preload] Preload script completed successfully!');
      console.log('[Preload] All APIs exposed and ready');
      console.log('[Preload] ============================================');
    } catch (error) {
      console.error('[Preload] ============================================');
      console.error('[Preload] CRITICAL ERROR exposing APIs:', error);
      if (error instanceof Error) {
        console.error('[Preload] Stack:', error.stack);
      }
      console.error('[Preload] ============================================');
    }
  }
}

// ==================== Execute Exposure ====================

ContextBridgeExposer.exposeAPIs();

// Verify exposure worked
console.log('[Preload] Script execution complete');

// ==================== TypeScript Module Export ====================

export type { ElectronAPI, PlatformInfo };
