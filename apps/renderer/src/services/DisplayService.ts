/**
 * Display Service - Business logic for display operations
 * 
 * This service abstracts display-related functionality including:
 * - Managing display configurations
 * - Opening/closing display windows
 * - Showing content on different displays
 * 
 * OOP Principles:
 * - Encapsulation: Private IPC service
 * - Single Responsibility: Only handles display operations
 * - Dependency Injection: Depends on IpcService abstraction
 * - Interface Segregation: Implements IDisplayService
 */

import { BaseService } from '../base/BaseService';
import type { IDisplayService, IIpcService } from '../types/services';
import type { Display, DisplayWindow } from '../types';

/**
 * Display Service Implementation
 */
export class DisplayService extends BaseService implements IDisplayService {
  protected readonly serviceName = 'DisplayService';
  
  private readonly ipc: IIpcService;

  /**
   * Constructor
   * @param ipcService - IPC service for communication
   */
  constructor(ipcService: IIpcService) {
    super();
    this.ipc = ipcService;
  }

  /**
   * Get all available displays
   * @returns Array of displays
   */
  public async getDisplays(): Promise<Display[]> {
    try {
      return await this.ipc.invoke('display:getDisplays') as Display[];
    } catch (error) {
      return this.handleError('getDisplays', error);
    }
  }

  /**
   * Open a display window
   * @param type - Window type
   * @param displayId - Target display ID
   */
  public async openWindow(type: DisplayWindow['type'], displayId: string): Promise<void> {
    try {
      await this.ipc.invoke('display:openWindow', type, displayId);
    } catch (error) {
      return this.handleError('openWindow', error);
    }
  }

  /**
   * Close a display window
   * @param type - Window type
   */
  public async closeWindow(type: DisplayWindow['type']): Promise<void> {
    try {
      await this.ipc.invoke('display:closeWindow', type);
    } catch (error) {
      return this.handleError('closeWindow', error);
    }
  }

  /**
   * Get window configuration
   * @param type - Window type
   * @returns Window configuration or null
   */
  public async getWindowConfig(type: DisplayWindow['type']): Promise<DisplayWindow | null> {
    try {
      return await this.ipc.invoke('display:getWindowConfig', type) as DisplayWindow | null;
    } catch (error) {
      this.logError('getWindowConfig failed', error);
      return null;
    }
  }

  /**
   * Set window bounds
   * @param type - Window type
   * @param bounds - Window bounds
   */
  public async setWindowBounds(
    type: DisplayWindow['type'],
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    try {
      await this.ipc.invoke('display:setWindowBounds', type, bounds);
    } catch (error) {
      return this.handleError('setWindowBounds', error);
    }
  }

  /**
   * Clear all display content
   */
  public async clearAll(): Promise<void> {
    try {
      await this.ipc.invoke('display:clearAll');
    } catch (error) {
      return this.handleError('clearAll', error);
    }
  }

  /**
   * Display a video directly on the audience screen
   */
  public async displayVideoSlide(path: string, duration?: number): Promise<void> {
    try {
      await this.ipc.invoke('display:videoSlide', path, duration);
    } catch (error) {
      this.logWarn('display:videoSlide failed, falling back to direct audience send', error);
      try {
        await this.ipc.invoke('send:audience', 'display-video-slide', path);
        if (duration !== undefined) {
          await this.ipc.invoke('send:confidence', 'start-video-countdown', duration);
        }
        return;
      } catch (fallbackError) {
        return this.handleError('displayVideoSlide', fallbackError);
      }
    }
  }
}

export default DisplayService;
