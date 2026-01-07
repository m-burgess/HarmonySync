/**
 * Unified API that works with both Tauri and Electron
 * Auto-detects the environment and provides the appropriate API
 */

const isElectron = typeof window !== 'undefined' && window.electronAPI;
const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

let api = null;

if (isElectron) {
  // Use Electron API through compatibility layer
  api = {
    invoke: async (command, args = {}) => {
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        return window.__TAURI__.invoke(command, args);
      }
      throw new Error(`Command ${command} not available`);
    },
    
    event: {
      listen: async (eventName, handler) => {
        if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
          return window.__TAURI__.event.listen(eventName, handler);
        }
        throw new Error('Event system not available');
      },
      emit: async (eventName, payload) => {
        if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
          return window.__TAURI__.event.emit(eventName, payload);
        }
        throw new Error('Event emit not available');
      }
    },

    dialog: {
      open: async (options = {}) => {
        const result = await window.electronAPI.showOpenDialog({
          title: options.title,
          directory: options.directory,
          multiple: options.multiple,
          filters: options.filters
        });
        if (result.canceled) return null;
        return options.multiple ? result.filePaths : result.filePaths[0];
      },
      save: async (options = {}) => {
        const result = await window.electronAPI.showSaveDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          filters: options.filters
        });
        return result.canceled ? null : result.filePath;
      },
      message: async (message, options = {}) => {
        await window.electronAPI.showMessageBox({
          type: options.type || 'info',
          title: options.title || 'Message',
          message: message
        });
      }
    }
  };
} else if (isTauri) {
  // Dynamically import Tauri API only if in Tauri environment
  (async () => {
    try {
      const TauriAPI = await import('@tauri-apps/api');
      const TauriDialog = await import('@tauri-apps/plugin-dialog');
      
      api = {
        invoke: TauriAPI.invoke,
        event: TauriAPI.event,
        dialog: TauriDialog
      };
    } catch (error) {
      console.error('Failed to load Tauri API:', error);
      api = createFallbackAPI();
    }
  })();
} else {
  // Fallback for development
  console.warn('Running in browser mode - API calls will be mocked');
  api = createFallbackAPI();
}

function createFallbackAPI() {
  return {
    invoke: async () => { throw new Error('Not in desktop environment'); },
    event: {
      listen: async () => () => {},
      emit: async () => {}
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      message: async () => {}
    }
  };
}

// Ensure API is always available
if (!api) {
  api = createFallbackAPI();
}

export const invoke = api.invoke;
export const event = api.event;
export const dialog = api.dialog;

export default api;
