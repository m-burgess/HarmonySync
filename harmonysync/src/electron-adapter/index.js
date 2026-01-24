// Electron adapter to replace Tauri APIs
// This module provides a compatible interface for React components
// Simplified for Electron-only usage (Tauri support removed)

// CRITICAL: Store API in a global that survives HMR
// Use globalThis to access the real window object, not Vite's HMR context
const getGlobalWindow = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof self !== 'undefined') return self;
  return {};
};

const globalWindow = getGlobalWindow();

// Module-level cache that persists across HMR
let cachedElectronAPI = null;

// On module load, try to recover cache from multiple sources
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

// Helper to get electronAPI - waits if not immediately available
async function getElectronAPI() {
  // Return cached API if available
  if (cachedElectronAPI) {
    return cachedElectronAPI;
  }
  
  // If we're not in a browser environment, fail immediately
  if (typeof globalWindow === 'undefined') {
    console.error('[electron-adapter] Not in browser context');
    throw new Error('electronAPI not available - not in browser context');
  }
  
  // CRITICAL: Check for immediately available API from multiple sources
  console.log('[electron-adapter] Checking for electronAPI...');
  console.log('[electron-adapter] - globalWindow:', typeof globalWindow);
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
  
  // If not immediately available, wait for it (with timeout)
  console.warn('[electron-adapter] ⚠️ electronAPI not immediately available, waiting...');
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds total
  
  while (attempts < maxAttempts) {
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
    
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  // Final diagnostic before failing
  console.error('[electron-adapter] ❌ Timeout! Final state:');
  console.error('[electron-adapter] - typeof globalWindow:', typeof globalWindow);
  console.error('[electron-adapter] - globalWindow === window:', globalWindow === (typeof window !== 'undefined' ? window : null));
  console.error('[electron-adapter] - globalWindow keys with "electron":', Object.keys(globalWindow).filter(k => k.includes('electron')));
  console.error('[electron-adapter] - globalWindow keys with "preload":', Object.keys(globalWindow).filter(k => k.includes('preload')));
  console.error('[electron-adapter] - All globalWindow keys (sample):', Object.keys(globalWindow).slice(0, 20));
  
  throw new Error('electronAPI not available - timeout after 5 seconds');
}

// Helper function to detect runtime environment
function isElectronRuntime() {
  // Check for either exposed reference
  return (
    typeof window !== 'undefined' &&
    (typeof window.electronAPI !== 'undefined' || typeof window.__electronAPICached !== 'undefined')
  );
}

// Event system
export const event = {
  listen: (eventName, callback) => {
    if (isElectronRuntime()) {
      const handler = (data) => callback({ payload: data });
      const cleanup = window.electronAPI.receive(eventName, handler);
      return cleanup || (() => {}); // Return the cleanup function from preload or empty function
    }
    return () => {};
  },
  
  emit: (eventName, payload) => {
    if (isElectronRuntime()) {
      // Electron events are handled through IPC
      console.log('Emit event:', eventName, payload);
    }
  }
};

// Dialog
export const dialog = {
  open: async (options) => {
    try {
      const api = await getElectronAPI();
      console.log('[electron-adapter] dialog.open invoked with options:', options);
      if (options.directory) {
        const res = await api.openDirectory(options);
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
  readTextFile: async (path) => {
    try {
      const api = await getElectronAPI();
      return await api.readFile(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to read file:', path, error);
      throw error;
    }
  },
  
  writeTextFile: async (path, content) => {
    try {
      const api = await getElectronAPI();
      return await api.writeFile(path, content);
    } catch (error) {
      console.error('[electron-adapter] Failed to write file:', path, error);
      throw error;
    }
  },
  
  readDir: async (path) => {
    try {
      const api = await getElectronAPI();
      return await api.readDir(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to read directory:', path, error);
      throw error;
    }
  },
  
  exists: async (path) => {
    try {
      const api = await getElectronAPI();
      return await api.exists(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to check if exists:', path, error);
      throw error;
    }
  },
  
  mkdir: async (path) => {
    try {
      const api = await getElectronAPI();
      return await api.mkdir(path);
    } catch (error) {
      console.error('[electron-adapter] Failed to create directory:', path, error);
      throw error;
    }
  },
  
  copyFile: async (source, destination) => {
    try {
      const api = await getElectronAPI();
      return await api.copyFile(source, destination);
    } catch (error) {
      console.error('[electron-adapter] Failed to copy file:', source, '->', destination, error);
      throw error;
    }
  }
};

// Core - invoke commands
export const core = {
  invoke: async (command, args = {}) => {
    try {
      const api = await getElectronAPI();
      // Map Tauri commands to Electron IPC handlers
      return await invokeElectronCommand(command, args, api);
    } catch (error) {
      console.error('[electron-adapter] Failed to invoke command:', command, error);
      throw error;
    }
  }
};

// Map Tauri commands to Electron IPC calls
async function invokeElectronCommand(command, args, api) {
  if (!api) {
    api = await getElectronAPI();
  }
  
  switch (command) {
    // Database operations
    case 'db_query':
      return await api.dbQuery(args.query, args.params);
    case 'db_run':
      return await api.dbRun(args.query, args.params);
    case 'db_get':
      return await api.dbGet(args.query, args.params);
    case 'db_all':
      return await api.dbAll(args.query, args.params);
    
    // FFmpeg operations
    case 'convert_to_ogg':
      return await api.convertToOgg(args.input_path, args.output_dir);
    case 'transpose_audio':
      return await api.transposeAudio(args.song_path, args.semitones);
    case 'get_video_metadata':
      return await api.getVideoMetadata(args.path);
    case 'transcode_video':
      return await api.transcodeVideo(args.input_path);
    case 'generate_thumbnail':
      return await api.generateThumbnail(args.video_path);
    
    // Display operations
    case 'display_video_slide':
      return await api.displayVideoSlide(args.path, args.duration);
    case 'display_slide':
      return await api.displaySlide(args.content);
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
      return await api.sendMidiNote(args.device, args.note, args.velocity, args.duration);
    
    // Lyrics
    case 'search_lyrics':
      return await api.searchLyrics(args.title, args.artist);
    case 'fetch_lyrics':
      return await api.fetchLyrics(args.song_id);
    
    // Google Drive
    case 'gdrive_auth':
      return await api.googleDriveAuth();
    case 'gdrive_list_files':
      return await api.googleDriveListFiles(args.folder_id);
    case 'gdrive_download_file':
      return await api.googleDriveDownloadFile(args.file_id, args.destination);
    case 'gdrive_sync_folder':
      return await api.googleDriveSyncFolder(args.folder_id, args.local_path);
    
    // HTTP Server
    case 'get_http_server_url':
      return await api.getHttpServerUrl();
    
    // CSS generation
    case 'generate_background_css':
      return await api.generateBackgroundCss(args.path);
    
    // Settings
    case 'settings:getDisplays':
      return await api.getDisplays();
    case 'settings:getAudioDevices':
      return await api.getAudioDevices();
    case 'settings:getSettingsPath':
      return await api.getSettingsPath();
    
    default:
      console.warn(`Unknown command: ${command}`);
      throw new Error(`Command not implemented: ${command}`);
  }
}

// Window
export const window = {
  getCurrent: () => {
    // For Electron, we don't need window management in renderer
    return {
      label: 'main',
      emit: (event, payload) => {
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
