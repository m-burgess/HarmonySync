// Electron adapter to replace Tauri APIs
// This module provides a compatible interface for React components
// Simplified for Electron-only usage (Tauri support removed)

// Module-level cache that persists across HMR
let cachedElectronAPI = null;
let apiCheckInitiated = false;
let apiAvailablePromise = null;

// Helper to get electronAPI quickly (no polling needed since preload confirmed)
async function getElectronAPI() {
  if (cachedElectronAPI) {
    return cachedElectronAPI;
  }
  if (typeof window !== 'undefined') {
    if (window.__electronAPICached) {
      cachedElectronAPI = window.__electronAPICached;
      return cachedElectronAPI;
    }
    if (window.electronAPI) {
      cachedElectronAPI = window.electronAPI;
      return cachedElectronAPI;
    }
  }
  throw new Error('electronAPI not available - unexpected renderer context');
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
