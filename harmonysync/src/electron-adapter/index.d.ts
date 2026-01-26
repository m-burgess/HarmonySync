/**
 * Type declarations for electron-adapter module
 * This provides TypeScript types for the Electron adapter
 */

// Event system
export const event: {
  listen: (eventName: string, callback: (data: { payload: any }) => void) => () => void;
  emit: (eventName: string, payload: any) => void;
};

// Dialog system
export const dialog: {
  open: (options: { directory?: boolean; filters?: any }) => Promise<string | null>;
};

// File system
export const fs: {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  readDir: (path: string) => Promise<any[]>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (source: string, destination: string) => Promise<void>;
};

// Core - invoke commands
export const core: {
  invoke: (command: string, args?: any) => Promise<any>;
};

// Window
export const window: {
  getCurrent: () => {
    label: string;
    emit: (event: string, payload: any) => void;
  };
};

// Default export
declare const adapter: {
  event: typeof event;
  dialog: typeof dialog;
  fs: typeof fs;
  core: typeof core;
  window: typeof window;
  isElectron: boolean;
};

export default adapter;
