/**
 * IPC Service - Abstraction layer for Electron IPC communication
 * 
 * This service wraps the Electron IPC API to:
 * 1. Make frontend code testable (can mock this service)
 * 2. Provide type-safe API for IPC calls
 * 3. Handle errors consistently
 * 4. Support both invoke (request/response) and send (fire-and-forget) patterns
 * 
 * OOP Principles:
 * - Encapsulation: Private electronAPI, public methods
 * - Single Responsibility: Only handles IPC communication
 * - Interface Segregation: Implements IIpcService
 */

import { BaseService } from '../base/BaseService';
import type { IIpcService } from '../types/services';
import type { UnsubscribeFunction } from '../types';
import type { ElectronAPI } from '../electron-adapter/index.js';

/**
 * IPC Service Implementation
 */
export class IpcService extends BaseService implements IIpcService {
  protected readonly serviceName = 'IpcService';
  
  private readonly electronAPI: ElectronAPI;

  /**
   * Constructor
   * @param electronAPI - Electron API from window (defaults to window.electronAPI)
   */
  constructor(electronAPI: ElectronAPI = window.electronAPI!) {
    super();
    
    if (!electronAPI) {
      throw new Error('Electron API not available. IpcService requires window.electronAPI.');
    }
    
    this.electronAPI = electronAPI;
  }

  /**
   * Invoke an IPC handler and wait for response
   * @param channel - IPC channel name
   * @param args - Arguments to pass to handler
   * @returns Response from handler
   */
  public async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    try {
      if (!this.electronAPI.invoke) {
        throw new Error('Electron API does not support invoke method');
      }
      return await this.electronAPI.invoke(channel, ...args);
    } catch (error) {
      this.logError(`IPC invoke failed on channel '${channel}'`, error);
      throw new Error(`IPC Error (${channel}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a message without waiting for response
   * @param channel - IPC channel name
   * @param args - Arguments to pass to handler
   */
  public send(channel: string, ...args: unknown[]): void {
    try {
      if (!this.electronAPI.send) {
        throw new Error('Electron API does not support send method');
      }
      this.electronAPI.send(channel, ...args);
    } catch (error) {
      this.logError(`IPC send failed on channel '${channel}'`, error);
      throw new Error(`IPC Error (${channel}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register a listener for messages from main process
   * @param channel - IPC channel name
   * @param callback - Callback to handle messages
   * @returns Cleanup function to remove listener
   */
  public on(channel: string, callback: (...args: unknown[]) => void): UnsubscribeFunction {
    if (!this.electronAPI.on) {
      this.logWarn('Electron API does not support .on() for this channel:', channel);
      return () => {};
    }
    
    this.electronAPI.on(channel, callback);
    
    return () => {
      if (this.electronAPI.removeListener) {
        this.electronAPI.removeListener(channel, callback);
      }
    };
  }

  /**
   * Register a one-time listener for messages from main process
   * @param channel - IPC channel name
   * @param callback - Callback to handle message
   */
  public once(channel: string, callback: (...args: unknown[]) => void): void {
    if (!this.electronAPI.once) {
      this.logWarn('Electron API does not support .once() for this channel:', channel);
      return;
    }
    
    this.electronAPI.once(channel, callback);
  }
}

export default IpcService;
