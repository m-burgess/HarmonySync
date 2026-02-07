// Electron adapter to replace Tauri APIs
// This module provides a compatible interface for React components
// Simplified for Electron-only usage (Tauri support removed)

// Type definitions for ElectronAPI
interface DialogOpenOptions {
  directory?: boolean;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface DisplayConfig {
  id?: string;
  name: string;
  displayId: number;
  enabled: boolean;
  outputType: string;
  chromaKey?: {
    enabled: boolean;
    color: string;
    threshold: number;
  };
  [key: string]: unknown;
}

export interface ElectronAPI {
  // Generic IPC methods
  invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>;
  send?: (channel: string, ...args: unknown[]) => void;
  on?: (channel: string, callback: (...args: unknown[]) => void) => void;
  once?: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (channel: string, callback: (...args: unknown[]) => void) => void;
  
  // IPC
  receive: (channel: string, callback: (data: unknown) => void) => (() => void) | undefined;
  
  // Dialog
  openDirectory: (options?: { multiple?: boolean }) => Promise<string[] | string | null>;
  openFile: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>;
  
  // File system
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readDir: (path: string) => Promise<DirEntry[]>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (source: string, destination: string) => Promise<void>;
  
  // Database
  dbQuery: (query: string, params?: unknown[]) => Promise<unknown>;
  dbRun: (query: string, params?: unknown[]) => Promise<unknown>;
  dbGet: (query: string, params?: unknown[]) => Promise<unknown>;
  dbAll: (query: string, params?: unknown[]) => Promise<unknown[]>;
  
  // FFmpeg
  convertToOgg: (inputPath: string, outputDir: string) => Promise<string>;
  transposeAudio: (songPath: string, semitones: number) => Promise<string>;
  getVideoMetadata: (path: string) => Promise<unknown>;
  transcodeVideo: (inputPath: string) => Promise<string>;
  generateThumbnail: (videoPath: string) => Promise<string>;
  
  // Display
  displayVideoSlide: (path: string, duration: number) => Promise<void>;
  displaySlide: (content: unknown) => Promise<void>;
  displayBlackScreen: () => Promise<void>;
  
  // Windows
  showAudienceWindow: () => Promise<void>;
  hideAudienceWindow: () => Promise<void>;
  showConfidenceWindow: () => Promise<void>;
  hideConfidenceWindow: () => Promise<void>;
  showLowerThirdsWindow: () => Promise<void>;
  hideLowerThirdsWindow: () => Promise<void>;
  openPreserviceMusicWindow: () => Promise<void>;
  closePreserviceMusicWindow: () => Promise<void>;
  openSchedulerWindow: () => Promise<void>;
  
  // MIDI
  getMidiDevices: () => Promise<string[]>;
  sendMidiNote: (device: string, note: number, velocity: number, duration: number) => Promise<void>;
  
  // Lyrics
  searchLyrics: (title: string, artist: string) => Promise<unknown[]>;
  fetchLyrics: (songId: string) => Promise<unknown>;
  
  // Google Drive
  googleDriveAuth: () => Promise<unknown>;
  googleDriveListFiles: (folderId: string) => Promise<unknown[]>;
  googleDriveDownloadFile: (fileId: string, destination: string) => Promise<void>;
  googleDriveSyncFolder: (folderId: string, localPath: string) => Promise<void>;
  
  // HTTP Server
  getHttpServerUrl: () => Promise<string>;
  
  // CSS
  generateBackgroundCss: (path: string) => Promise<string>;
  
  // Settings
  getDisplays: () => Promise<unknown[]>;
  getAudioDevices: () => Promise<unknown[]>;
  getSettingsPath: () => Promise<string>;
  
  // Display Configuration
  displayConfigGetAll: () => Promise<DisplayConfig[]>;
  displayConfigGet: (id: string) => Promise<DisplayConfig>;
  displayConfigCreate: (config: Omit<DisplayConfig, 'id'>) => Promise<DisplayConfig>;
  displayConfigUpdate: (id: string, updates: Partial<DisplayConfig>) => Promise<DisplayConfig>;
  displayConfigDelete: (id: string) => Promise<void>;
  displayConfigReorder: (orderedIds: string[]) => Promise<void>;
  displayConfigGetEnabled: () => Promise<DisplayConfig[]>;
  
  // Slide Import
  onSlidesImportProgress?: (callback: (data: { message?: string; current?: number; total?: number }) => void) => (() => void) | undefined;
  validateSlideFile?: (path: string) => Promise<{ valid: boolean; message?: string }>;
  importSlidesFromFolder?: (folder: string, options: { dpi: number; format: 'png' | 'jpeg' }) => Promise<Array<{ name: string; type: string; path: string }>>;
  importPdfSlides?: (file: string, options: { dpi: number; format: 'png' | 'jpeg' }) => Promise<Array<{ name: string; type: string; path: string }>>;
  importPowerpointSlides?: (file: string, options: { dpi: number; format: 'png' | 'jpeg' }) => Promise<Array<{ name: string; type: string; path: string }>>;
  importSlidesFromZip?: (file: string, options: { dpi: number; format: 'png' | 'jpeg'; deleteZip?: boolean; importSlidesOnly?: boolean }) => Promise<{ slides?: unknown[]; servicePath?: string }>;
  scanServiceFolder?: (path: string) => Promise<{ servicePath?: string; slides?: unknown[]; songs?: unknown[] }>;
  sendToMain?: (channel: string, data: unknown) => void;
}

// Global window type augmentation
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __electronAPICached?: ElectronAPI;
    __electronAPI_PERMANENT_CACHE?: ElectronAPI;
    __preloadReady?: boolean;
  }
  
  // For globalThis type safety
  var electronAPI: ElectronAPI | undefined;
  var __electronAPICached: ElectronAPI | undefined;
  var __electronAPI_PERMANENT_CACHE: ElectronAPI | undefined;
  var __preloadReady: boolean | undefined;
}

// Type for global window object that could be window, globalThis, or self
type GlobalWindow = (Window & typeof globalThis) | Record<string, unknown>;

// CRITICAL: Store API in a global that survives HMR
// Use globalThis to access the real window object, not Vite's HMR context
const getGlobalWindow = (): GlobalWindow => {
  if (typeof globalThis !== 'undefined') return globalThis as GlobalWindow;
  if (typeof window !== 'undefined') return window as GlobalWindow;
  if (typeof self !== 'undefined') return self as GlobalWindow;
  return {};
};

const globalWindow = getGlobalWindow();

// Module-level cache that persists across HMR
let cachedElectronAPI: ElectronAPI | null = null;

// Type guard to check if globalWindow has electronAPI properties
function hasElectronAPI(obj: GlobalWindow): obj is Window & typeof globalThis {
  return typeof obj === 'object' && obj !== null && (
    '__electronAPICached' in obj ||
    'electronAPI' in obj ||
    '__electronAPI_PERMANENT_CACHE' in obj
  );
}

// On module load, try to recover cache from multiple sources
if (hasElectronAPI(globalWindow)) {
  if (globalWindow.__electronAPICached) {
    cachedElectronAPI = globalWindow.__electronAPICached;
    console.log('[electron-adapter] Module loaded - recovered from __electronAPICached');
  } else if (globalWindow.electronAPI) {
    cachedElectronAPI = globalWindow.electronAPI;
    globalWindow.__electronAPICached = globalWindow.electronAPI;
    console.log('[electron-adapter] Module loaded - cached electronAPI');
  } else if (globalWindow.__electronAPI_PERMANENT_CACHE) {
    // Last resort: permanent cache
    cachedElectronAPI = globalWindow.__electronAPI_PERMANENT_CACHE;
    console.log('[electron-adapter] Module loaded - recovered from permanent cache');
  }
}

// Helper to get electronAPI - waits if not immediately available
async function getElectronAPI(): Promise<ElectronAPI> {
  // Return cached API if available
  if (cachedElectronAPI) {
    return cachedElectronAPI;
  }
  
  // If we're not in a browser environment, fail immediately
  if (typeof globalWindow === 'undefined' || !globalWindow || typeof globalWindow !== 'object') {
    console.error('[electron-adapter] Not in browser context');
    throw new Error('electronAPI not available - not in browser context');
  }
  
  // CRITICAL: Check for immediately available API from multiple sources
  console.log('[electron-adapter] Checking for electronAPI...');
  console.log('[electron-adapter] - globalWindow:', typeof globalWindow);
  
  if (hasElectronAPI(globalWindow)) {
    console.log('[electron-adapter] - globalWindow.__electronAPICached:', typeof globalWindow.__electronAPICached);
    console.log('[electron-adapter] - globalWindow.electronAPI:', typeof globalWindow.electronAPI);
    console.log('[electron-adapter] - globalWindow.__preloadReady:', globalWindow.__preloadReady);
    console.log('[electron-adapter] - globalWindow.__electronAPI_PERMANENT_CACHE:', typeof globalWindow.__electronAPI_PERMANENT_CACHE);
    
    // Try permanent cache first (most reliable)
    if (globalWindow.__electronAPI_PERMANENT_CACHE) {
      cachedElectronAPI = globalWindow.__electronAPI_PERMANENT_CACHE;
      console.log('[electron-adapter] ✅ Using permanent cache');
      return cachedElectronAPI;
    }
    
    if (globalWindow.__electronAPICached) {
      cachedElectronAPI = globalWindow.__electronAPICached;
      // Store in permanent cache
      globalWindow.__electronAPI_PERMANENT_CACHE = cachedElectronAPI;
      console.log('[electron-adapter] ✅ Using __electronAPICached (stored in permanent cache)');
      return cachedElectronAPI;
    }
    
    if (globalWindow.electronAPI) {
      cachedElectronAPI = globalWindow.electronAPI;
      console.log('[electron-adapter] ✅ Using globalWindow.electronAPI');
      // Cache it in all locations
      globalWindow.__electronAPICached = globalWindow.electronAPI;
      globalWindow.__electronAPI_PERMANENT_CACHE = globalWindow.electronAPI;
      return cachedElectronAPI;
    }
  }
  
  // If not immediately available, wait for it (with timeout)
  console.warn('[electron-adapter] ⚠️ electronAPI not immediately available, waiting...');
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds total
  
  while (attempts < maxAttempts) {
    if (hasElectronAPI(globalWindow)) {
      // Check permanent cache first
      if (globalWindow.__electronAPI_PERMANENT_CACHE) {
        cachedElectronAPI = globalWindow.__electronAPI_PERMANENT_CACHE;
        console.log('[electron-adapter] ✅ Found in permanent cache after', attempts * 100, 'ms');
        return cachedElectronAPI;
      }
      if (globalWindow.__electronAPICached) {
        cachedElectronAPI = globalWindow.__electronAPICached;
        globalWindow.__electronAPI_PERMANENT_CACHE = cachedElectronAPI;
        console.log('[electron-adapter] ✅ electronAPI became available after', attempts * 100, 'ms');
        return cachedElectronAPI;
      }
      if (globalWindow.electronAPI) {
        cachedElectronAPI = globalWindow.electronAPI;
        globalWindow.__electronAPICached = globalWindow.electronAPI;
        globalWindow.__electronAPI_PERMANENT_CACHE = globalWindow.electronAPI;
        console.log('[electron-adapter] ✅ electronAPI became available after', attempts * 100, 'ms');
        return cachedElectronAPI;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  // Final diagnostic before failing
  console.error('[electron-adapter] ❌ Timeout! Final state:');
  console.error('[electron-adapter] - typeof globalWindow:', typeof globalWindow);
  console.error('[electron-adapter] - globalWindow === window:', globalWindow === (typeof window !== 'undefined' ? window : null));
  
  if (typeof globalWindow === 'object' && globalWindow !== null) {
    const keys = Object.keys(globalWindow);
    console.error('[electron-adapter] - globalWindow keys with "electron":', keys.filter(k => k.includes('electron')));
    console.error('[electron-adapter] - globalWindow keys with "preload":', keys.filter(k => k.includes('preload')));
    console.error('[electron-adapter] - All globalWindow keys (sample):', keys.slice(0, 20));
  }
  
  throw new Error('electronAPI not available - timeout after 5 seconds');
}

// Helper function to detect runtime environment
function isElectronRuntime(): boolean {
  // Check for either exposed reference
  if (typeof globalThis.window === 'undefined') return false;
  const win = globalThis.window as Window;
  return (
    typeof win.electronAPI !== 'undefined' || typeof win.__electronAPICached !== 'undefined'
  );
}

// Event payload type
interface EventPayload<T = unknown> {
  payload: T;
}

type EventCallback<T = unknown> = (data: EventPayload<T>) => void;

const localEventListeners = new Map<string, Set<EventCallback>>();

const addLocalListener = (eventName: string, callback: EventCallback): (() => void) => {
  if (!localEventListeners.has(eventName)) {
    localEventListeners.set(eventName, new Set());
  }
  localEventListeners.get(eventName)!.add(callback);
  return () => {
    localEventListeners.get(eventName)?.delete(callback);
  };
};

const emitLocal = (eventName: string, payload: unknown): void => {
  const listeners = localEventListeners.get(eventName);
  if (!listeners || listeners.size === 0) return;
  const data = { payload } as EventPayload;
  listeners.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error('[electron-adapter] Event listener error:', eventName, error);
    }
  });
};

const cloneEventPayload = (payload: unknown): unknown => {
  if (payload === null || payload === undefined) return payload;
  const type = typeof payload;
  if (type !== 'object') return payload;

  const seen = new WeakSet<object>();
  const isDomObject = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (typeof Window !== 'undefined' && value instanceof Window) return true;
    if (typeof Document !== 'undefined' && value instanceof Document) return true;
    if (typeof Node !== 'undefined' && value instanceof Node) return true;
    return false;
  };

  try {
    const json = JSON.stringify(payload, (_key, value) => {
      if (typeof value === 'function' || typeof value === 'symbol') return undefined;
      if (isDomObject(value)) return undefined;
      if (value && typeof value === 'object') {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    });
    return json ? JSON.parse(json) : payload;
  } catch (error) {
    console.warn('[electron-adapter] JSON clone failed, using raw payload:', error);
    return payload;
  }
};

// Event system
export const event = {
  listen: <T = unknown>(eventName: string, callback: (data: EventPayload<T>) => void): (() => void) => {
    const removeLocal = addLocalListener(eventName, callback as EventCallback);
    if (isElectronRuntime()) {
      const win = globalThis.window as Window;
      const handler = (data: unknown) => callback({ payload: data as T });
      const cleanup = win.electronAPI!.receive(eventName, handler);
      const removeIpc = cleanup || (() => {});
      return () => {
        removeLocal();
        removeIpc();
      };
    }
    return removeLocal;
  },
  
  emit: (eventName: string, payload: unknown): void => {
    const safePayload = cloneEventPayload(payload);
    emitLocal(eventName, safePayload);

    if (!isElectronRuntime()) return;
    const win = globalThis.window as Window;
    const api = win.electronAPI || win.__electronAPICached;
    if (!api) return;

    const audienceEvents = new Set([
      'set-background',
      'display-lyric-slide',
      'display-image-slide',
      'clear-lyric-display',
      'navigate',
      'start-background-video',
      'stop-background-video',
      'display-video-slide'
    ]);
    const confidenceEvents = new Set([
      'display-confidence-slide',
      'clear-confidence-display',
      'video-progress'
    ]);
    const lowerThirdsEvents = new Set([
      'set-lower-thirds-text'
    ]);
    const mainEvents = new Set([
      'video-ended'
    ]);

    if (audienceEvents.has(eventName) && api.sendToAudience) {
      api.sendToAudience(eventName, safePayload);
    }
    if (confidenceEvents.has(eventName) && api.sendToConfidence) {
      api.sendToConfidence(eventName, safePayload);
    }
    if (lowerThirdsEvents.has(eventName) && api.sendToLowerThirds) {
      api.sendToLowerThirds(eventName, safePayload);
    }
    if (mainEvents.has(eventName) && api.sendToMain) {
      api.sendToMain(eventName, safePayload);
    }
  }
};

// Dialog
export const dialog = {
  open: async (options: DialogOpenOptions): Promise<string | string[] | null> => {
    try {
      const api = await getElectronAPI();
      console.log('[electron-adapter] dialog.open invoked with options:', options);
      if (options.directory) {
        const res = await api.openDirectory({ multiple: options.multiple });
        console.log('[electron-adapter] dialog.open directory result:', res);
        return res;
      }
      const res = await api.openFile(options.filters);
      console.log('[electron-adapter] dialog.open file result:', res);
      return res;
    } catch (error) {
      console.error('[electron-adapter] dialog.open failed:', error);
      return null;
    }
  }
};

// File system
export const fs = {
  readTextFile: async (path: string): Promise<string> => {
    try {
      const api = await getElectronAPI();
      return await api.readFile(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to read file:', path, error);
      throw error;
    }
  },
  
  writeTextFile: async (path: string, content: string): Promise<void> => {
    try {
      const api = await getElectronAPI();
      return await api.writeFile(path, content);
    } catch (error) {
      console.error('[electron-adapter] Failed to write file:', path, error);
      throw error;
    }
  },
  
  readDir: async (path: string): Promise<DirEntry[]> => {
    try {
      const api = await getElectronAPI();
      return await api.readDir(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to read directory:', path, error);
      throw error;
    }
  },
  
  exists: async (path: string): Promise<boolean> => {
    try {
      const api = await getElectronAPI();
      return await api.exists(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to check if exists:', path, error);
      throw error;
    }
  },
  
  mkdir: async (path: string): Promise<void> => {
    try {
      const api = await getElectronAPI();
      return await api.mkdir(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to create directory:', path, error);
      throw error;
    }
  },
  
  copyFile: async (source: string, destination: string): Promise<void> => {
    try {
      const api = await getElectronAPI();
      return await api.copyFile(source, destination);
    } catch (error) {
      console.error('[electron-adapter] Failed to copy file:', source, '->', destination, error);
      throw error;
    }
  }
};

// Adapter normalizes args at runtime; specific command-arg interfaces were removed.

// Core - invoke commands
export const core = {
  invoke: async (command: string, ...args: unknown[]): Promise<unknown> => {
    try {
      const api = await getElectronAPI();
      // Try adapter mapping first, otherwise fallback to preload invoke
      try {
        return await invokeElectronCommand(command, args, api);
      } catch (err) {
        // If mapping didn't handle it, forward to the preload's invoke handler
        if (api && typeof api.invoke === 'function') {
          // Preserve original behavior: pass channel and args through
          // @ts-ignore - dynamic invoke signature
          return await (api.invoke as (...a: unknown[]) => Promise<unknown>)(command, ...args);
        }
        throw err;
      }
    } catch (error) {
      console.error('[electron-adapter] Failed to invoke command:', command, error);
      throw error;
    }
  },

  // Convert file paths to proper URLs for Electron
  convertFileSrc: (filePath: string): string => {
    // In Electron, local files can be accessed directly
    // Convert to local:// protocol if needed
    if (filePath.startsWith('local://')) {
      return filePath;
    }
    if (filePath.startsWith('file://')) {
      let stripped = filePath.replace(/^file:\/\//, '').replace(/\\/g, '/');
      if (/^[A-Za-z]\//.test(stripped)) {
        stripped = `${stripped[0].toUpperCase()}:/${stripped.slice(2)}`;
      }
      return `local://${encodeURI(stripped)}`;
    }
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    // Convert to local:// URL
    let normalized = filePath.replace(/\\/g, '/');
    if (/^[A-Za-z]\//.test(normalized)) {
      normalized = `${normalized[0].toUpperCase()}:/${normalized.slice(2)}`;
    }
    if (/^\/[A-Za-z]\//.test(normalized)) {
      normalized = `${normalized[1].toUpperCase()}:/${normalized.slice(3)}`;
    }
    return `local://${encodeURI(normalized)}`;
  }
};

// Convenience helpers for window operations (typed wrappers)
// These provide a clear, programmatic interface for macros and other callers
export const preserviceWindow = {
  open: async (): Promise<void> => {
    await core.invoke('open_preservice_music_window');
  },

  close: async (): Promise<void> => {
    await core.invoke('close_preservice_music_window');
  }
};

// Map Tauri commands to Electron IPC calls
async function invokeElectronCommand(command: string, args: unknown[], api?: ElectronAPI): Promise<unknown> {
  if (!api) {
    api = await getElectronAPI();
  }

  // Normalize args array
  const a = Array.isArray(args) ? args : [args];

  switch (command) {
    // Database operations
    case 'db_query':
      return await api.dbQuery(a[0] as string, a[1] as unknown[] | undefined);
    case 'db_run':
      return await api.dbRun(a[0] as string, a[1] as unknown[] | undefined);
    case 'db_get':
      return await api.dbGet(a[0] as string, a[1] as unknown[] | undefined);
    case 'db_all':
      return await api.dbAll(a[0] as string, a[1] as unknown[] | undefined);
    
    // FFmpeg operations
    case 'convert_to_ogg':
      return await api.convertToOgg(a[0] as string, a[1] as string);
    case 'transpose_audio':
      return await api.transposeAudio(a[0] as string, a[1] as number);
    case 'get_video_metadata':
      return await api.getVideoMetadata((a[0] as { inputPath?: string; path?: string })?.inputPath || (a[0] as { path?: string })?.path || (a[0] as string));
    case 'transcode_video':
      return await api.transcodeVideo((a[0] as { inputPath?: string })?.inputPath || (a[0] as string));
    case 'generate_thumbnail':
      return await api.generateThumbnail((a[0] as { videoPath?: string; path?: string })?.videoPath || (a[0] as { path?: string })?.path || (a[0] as string));
    
    // Display operations
    case 'display_video_slide':
      if (a[0] && typeof a[0] === 'object') {
        const payload = a[0] as { path?: string; duration?: number };
        return await api.displayVideoSlide(payload.path as string, payload.duration ?? (a[1] as number));
      }
      return await api.displayVideoSlide(a[0] as string, a[1] as number);
    case 'display_slide':
      return await api.displaySlide(a[0]);
    case 'display_black_screen':
      return await api.displayBlackScreen();
    
    // Window operations
    case 'show_audience_window':
      return await api.showAudienceWindow();
    case 'hide_audience_window':
      return await api.hideAudienceWindow();
    case 'show_confidence_window':
      return await api.showConfidenceWindow();
    case 'hide_confidence_window':
      return await api.hideConfidenceWindow();
    case 'show_lower_thirds_window':
      return await api.showLowerThirdsWindow();
    case 'hide_lower_thirds_window':
      return await api.hideLowerThirdsWindow();
    case 'open_preservice_music_window':
      return await api.openPreserviceMusicWindow();
    case 'close_preservice_music_window':
      return await api.closePreserviceMusicWindow();
    case 'open_scheduler_window':
      return await api.openSchedulerWindow();
    
    // MIDI operations
    case 'get_midi_devices':
      return await api.getMidiDevices();
    case 'send_midi_note':
      return await api.sendMidiNote(a[0] as string, a[1] as number, a[2] as number, a[3] as number);
    
    // Lyrics
    case 'search_lyrics':
      return await api.searchLyrics(a[0] as string, a[1] as string);
    case 'fetch_lyrics':
      return await api.fetchLyrics(a[0] as string);
    
    // Google Drive
    case 'gdrive_auth':
      return await api.googleDriveAuth();
    case 'gdrive_list_files':
      return await api.googleDriveListFiles(a[0] as string);
    case 'gdrive_download_file':
      return await api.googleDriveDownloadFile(a[0] as string, a[1] as string);
    case 'gdrive_sync_folder':
      return await api.googleDriveSyncFolder(a[0] as string, a[1] as string);
    
    // HTTP Server
    case 'get_http_server_url':
      return await api.getHttpServerUrl();
    
    // CSS generation
    case 'generate_background_css':
      return await api.generateBackgroundCss(a[0] as string);
    
    // Settings
    case 'settings:getDisplays':
      return await api.getDisplays();
    case 'settings:getAudioDevices':
      return await api.getAudioDevices();
    case 'settings:getSettingsPath':
      return await api.getSettingsPath();
    
    // Display Configuration
    case 'displayConfig:getAll':
      return await api.displayConfigGetAll();
    case 'displayConfig:get':
      return await api.displayConfigGet(a[0] as string);
    case 'displayConfig:create':
      return await api.displayConfigCreate(a[0] as Omit<DisplayConfig, 'id'>);
    case 'displayConfig:update':
      return await api.displayConfigUpdate(a[0] as string, a[1] as Partial<DisplayConfig>);
    case 'displayConfig:delete':
      return await api.displayConfigDelete(a[0] as string);
    case 'displayConfig:reorder':
      return await api.displayConfigReorder(a[0] as string[]);
    case 'displayConfig:getEnabled':
      return await api.displayConfigGetEnabled();
    
    default:
      console.warn(`Unknown command: ${command}`);
      throw new Error(`Command not implemented: ${command}`);
  }
}

// Window API
export const window = {
  getCurrent: () => {
    // For Electron, we don't need window management in renderer
    return {
      label: 'main',
      emit: (event: string, payload: unknown): void => {
        console.log('Window emit:', event, payload);
      }
    };
  }
};

// Export everything as default for easy import
export default {
  event,
  dialog,
  fs,
  core,
  window,
  isElectron: isElectronRuntime()
};
