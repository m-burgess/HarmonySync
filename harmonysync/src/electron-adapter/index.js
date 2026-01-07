// Electron adapter to replace Tauri APIs
// This module provides a compatible interface for React components

const isTauri = typeof window !== 'undefined' && window.__TAURI__;
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Event system
export const event = {
  listen: (eventName, callback) => {
    if (isTauri) {
      return window.__TAURI__.event.listen(eventName, callback);
    } else if (isElectron) {
      const handler = (data) => callback({ payload: data });
      window.electronAPI.receive(eventName, handler);
      return () => {}; // Return cleanup function
    }
    return () => {};
  },
  
  emit: (eventName, payload) => {
    if (isTauri) {
      return window.__TAURI__.event.emit(eventName, payload);
    } else if (isElectron) {
      // Electron events are handled through IPC
      console.log('Emit event:', eventName, payload);
    }
  }
};

// Dialog
export const dialog = {
  open: async (options) => {
    if (isTauri) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open(options);
    } else if (isElectron) {
      if (options.directory) {
        return await window.electronAPI.openDirectory();
      } else {
        return await window.electronAPI.openFile(options.filters);
      }
    }
    return null;
  }
};

// File system
export const fs = {
  readTextFile: async (path) => {
    if (isTauri) {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      return await readTextFile(path);
    } else if (isElectron) {
      return await window.electronAPI.readFile(path);
    }
    throw new Error('No file system API available');
  },
  
  writeTextFile: async (path, content) => {
    if (isTauri) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      return await writeTextFile(path, content);
    } else if (isElectron) {
      return await window.electronAPI.writeFile(path, content);
    }
    throw new Error('No file system API available');
  },
  
  readDir: async (path) => {
    if (isTauri) {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      return await readDir(path);
    } else if (isElectron) {
      return await window.electronAPI.readDir(path);
    }
    throw new Error('No file system API available');
  },
  
  exists: async (path) => {
    if (isTauri) {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(path);
    } else if (isElectron) {
      return await window.electronAPI.exists(path);
    }
    throw new Error('No file system API available');
  },
  
  mkdir: async (path) => {
    if (isTauri) {
      const { mkdir } = await import('@tauri-apps/plugin-fs');
      return await mkdir(path);
    } else if (isElectron) {
      return await window.electronAPI.mkdir(path);
    }
    throw new Error('No file system API available');
  },
  
  copyFile: async (source, destination) => {
    if (isTauri) {
      const { copyFile } = await import('@tauri-apps/plugin-fs');
      return await copyFile(source, destination);
    } else if (isElectron) {
      return await window.electronAPI.copyFile(source, destination);
    }
    throw new Error('No file system API available');
  }
};

// Core - invoke commands
export const core = {
  invoke: async (command, args = {}) => {
    if (isTauri) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(command, args);
    } else if (isElectron) {
      // Map Tauri commands to Electron IPC handlers
      return await invokeElectronCommand(command, args);
    }
    throw new Error('No invoke API available');
  }
};

// Map Tauri commands to Electron IPC calls
async function invokeElectronCommand(command, args) {
  const api = window.electronAPI;
  
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
    if (isTauri) {
      return window.__TAURI__.window.getCurrent();
    }
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
  isTauri,
  isElectron
};
