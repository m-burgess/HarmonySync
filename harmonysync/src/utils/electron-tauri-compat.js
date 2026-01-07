/**
 * Tauri to Electron API Compatibility Layer
 * This file provides a compatibility layer that maps Tauri API calls to Electron IPC
 * allowing the React frontend to work with minimal changes
 */

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Create the Tauri-compatible API object
export const invoke = async (command, args = {}) => {
  if (!isElectron) {
    throw new Error('Not running in Electron environment');
  }

  // Use the compatibility layer from preload script
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return window.__TAURI__.invoke(command, args);
  }

  throw new Error(`Command ${command} not implemented in Electron compatibility layer`);
};

// Event system compatibility
export const event = {
  listen: async (eventName, handler) => {
    if (!isElectron) {
      throw new Error('Not running in Electron environment');
    }

    if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
      return window.__TAURI__.event.listen(eventName, handler);
    }

    // Fallback to direct electronAPI
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on(eventName, handler);
      return () => {
        if (window.electronAPI.removeListener) {
          window.electronAPI.removeListener(eventName, handler);
        }
      };
    }

    throw new Error('Event system not available');
  },

  emit: async (eventName, payload) => {
    if (!isElectron) {
      throw new Error('Not running in Electron environment');
    }

    if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
      return window.__TAURI__.event.emit(eventName, payload);
    }

    throw new Error('Event emit not available');
  }
};

// Dialog compatibility
export const dialog = {
  open: async (options) => {
    if (!isElectron || !window.electronAPI) {
      throw new Error('Dialog API not available');
    }

    const result = await window.electronAPI.showOpenDialog({
      title: options.title,
      directory: options.directory,
      multiple: options.multiple,
      filters: options.filters ? options.filters.map(f => ({
        name: f.name,
        extensions: f.extensions
      })) : undefined
    });

    // Map Electron result to Tauri format
    if (result.canceled) {
      return null;
    }

    if (options.multiple) {
      return result.filePaths;
    }

    return result.filePaths[0];
  },

  save: async (options) => {
    if (!isElectron || !window.electronAPI) {
      throw new Error('Dialog API not available');
    }

    const result = await window.electronAPI.showSaveDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters ? options.filters.map(f => ({
        name: f.name,
        extensions: f.extensions
      })) : undefined
    });

    if (result.canceled) {
      return null;
    }

    return result.filePath;
  },

  message: async (message, options = {}) => {
    if (!isElectron || !window.electronAPI) {
      throw new Error('Dialog API not available');
    }

    await window.electronAPI.showMessageBox({
      type: options.type || 'info',
      title: options.title || 'Message',
      message: message
    });
  }
};

// Window management
export const window = {
  getCurrent: () => ({
    label: 'main',
    // Add other window methods as needed
  })
};

// Path utilities - simplified cross-platform implementation
export const path = {
  join: (...paths) => {
    // Normalize separators and remove empty parts
    const normalized = paths
      .map(p => p.replace(/[\\\/]+/g, '/'))
      .join('/')
      .replace(/\/+/g, '/');
    return normalized;
  },

  dirname: (filePath) => {
    const normalized = filePath.replace(/[\\\/]+/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash === -1 ? '.' : normalized.substring(0, lastSlash);
  },

  basename: (filePath, ext) => {
    const normalized = filePath.replace(/[\\\/]+/g, '/');
    let base = normalized.substring(normalized.lastIndexOf('/') + 1);
    if (ext && base.endsWith(ext)) {
      base = base.substring(0, base.length - ext.length);
    }
    return base;
  }
};

// Export a Tauri-compatible API object
const TauriAPI = {
  invoke,
  event,
  dialog,
  window,
  path
};

export default TauriAPI;
