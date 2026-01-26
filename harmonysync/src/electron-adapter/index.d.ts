/**
 * Type declarations for electron-adapter module
 * This provides TypeScript types for the Electron adapter
 */

export interface ElectronAdapter {
  openExternal(url: string): Promise<void>;
  getAppVersion(): Promise<string>;
  getPlatform(): string;
  // Add other methods as needed
}

declare const adapter: ElectronAdapter;
export default adapter;
