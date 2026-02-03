/**
 * Window Service
 * Handles window lifecycle management (show, hide, focus, creation)
 * Manages audience, confidence, and lower thirds windows across displays
 */

import { BrowserWindow } from 'electron';
import { BaseElectronService, IWindowService, ServiceConfig } from '@harmonysync/core';
import { WindowState } from '@harmonysync/core';

/**
 * Window getter function type
 */
type WindowGetter = () => BrowserWindow | null;

/**
 * Window Service Implementation
 * Provides comprehensive window management with proper error handling
 */
export class WindowService extends BaseElectronService implements IWindowService {
  protected readonly serviceName = 'WindowService';

  private audienceWindowGetter?: WindowGetter;
  private confidenceWindowGetter?: WindowGetter;
  private lowerThirdsWindowGetter?: WindowGetter;

  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the window service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Window service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Window service disposed');
  }

  /**
   * Register window getters
   * @param audienceGetter - Function to get audience window
   * @param confidenceGetter - Function to get confidence window
   * @param lowerThirdsGetter - Function to get lower thirds window
   */
  public registerWindowGetters(
    audienceGetter: WindowGetter,
    confidenceGetter: WindowGetter,
    lowerThirdsGetter: WindowGetter
  ): void {
    this.audienceWindowGetter = audienceGetter;
    this.confidenceWindowGetter = confidenceGetter;
    this.lowerThirdsWindowGetter = lowerThirdsGetter;
    this.log('info', 'Window getters registered');
  }

  /**
   * Show audience window
   * @returns Promise that resolves when window is shown
   */
  public async showAudience(): Promise<void> {
    try {
      const win = this.getWindow(this.audienceWindowGetter, 'audience');
      if (win) {
        win.show();
        this.log('info', 'Audience window shown');
      }
    } catch (error) {
      this.handleError('showAudience', error);
    }
  }

  /**
   * Hide audience window
   * @returns Promise that resolves when window is hidden
   */
  public async hideAudience(): Promise<void> {
    try {
      const win = this.getWindow(this.audienceWindowGetter, 'audience');
      if (win) {
        win.hide();
        this.log('info', 'Audience window hidden');
      }
    } catch (error) {
      this.handleError('hideAudience', error);
    }
  }

  /**
   * Show confidence window
   * @returns Promise that resolves when window is shown
   */
  public async showConfidence(): Promise<void> {
    try {
      const win = this.getWindow(this.confidenceWindowGetter, 'confidence');
      if (win) {
        win.show();
        this.log('info', 'Confidence window shown');
      }
    } catch (error) {
      this.handleError('showConfidence', error);
    }
  }

  /**
   * Hide confidence window
   * @returns Promise that resolves when window is hidden
   */
  public async hideConfidence(): Promise<void> {
    try {
      const win = this.getWindow(this.confidenceWindowGetter, 'confidence');
      if (win) {
        win.hide();
        this.log('info', 'Confidence window hidden');
      }
    } catch (error) {
      this.handleError('hideConfidence', error);
    }
  }

  /**
   * Show lower thirds window
   * @returns Promise that resolves when window is shown
   */
  public async showLowerThirds(): Promise<void> {
    try {
      const win = this.getWindow(this.lowerThirdsWindowGetter, 'lowerThirds');
      if (win) {
        win.show();
        this.log('info', 'Lower thirds window shown');
      }
    } catch (error) {
      this.handleError('showLowerThirds', error);
    }
  }

  /**
   * Hide lower thirds window
   * @returns Promise that resolves when window is hidden
   */
  public async hideLowerThirds(): Promise<void> {
    try {
      const win = this.getWindow(this.lowerThirdsWindowGetter, 'lowerThirds');
      if (win) {
        win.hide();
        this.log('info', 'Lower thirds window hidden');
      }
    } catch (error) {
      this.handleError('hideLowerThirds', error);
    }
  }

  /**
   * Toggle window visibility
   * @param windowType - Type of window to toggle
   * @returns Promise that resolves to new visibility state
   */
  public async toggleWindow(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<boolean> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (win) {
        const isVisible = win.isVisible();
        if (isVisible) {
          win.hide();
          this.log('info', `${windowType} window hidden`);
          return false;
        } else {
          win.show();
          this.log('info', `${windowType} window shown`);
          return true;
        }
      }
      return false;
    } catch (error) {
      this.handleError('toggleWindow', error);
    }
  }

  /**
   * Focus window
   * @param windowType - Type of window to focus
   * @returns Promise that resolves when window is focused
   */
  public async focusWindow(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<void> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (win) {
        win.focus();
        this.log('info', `${windowType} window focused`);
      }
    } catch (error) {
      this.handleError('focusWindow', error);
    }
  }

  /**
   * Minimize window
   * @param windowType - Type of window to minimize
   * @returns Promise that resolves when window is minimized
   */
  public async minimizeWindow(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<void> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (win) {
        win.minimize();
        this.log('info', `${windowType} window minimized`);
      }
    } catch (error) {
      this.handleError('minimizeWindow', error);
    }
  }

  /**
   * Maximize or restore window
   * @param windowType - Type of window to maximize
   * @returns Promise that resolves when window is maximized/restored
   */
  public async maximizeWindow(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<void> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize();
          this.log('info', `${windowType} window restored`);
        } else {
          win.maximize();
          this.log('info', `${windowType} window maximized`);
        }
      }
    } catch (error) {
      this.handleError('maximizeWindow', error);
    }
  }

  /**
   * Set window always on top
   * @param windowType - Type of window
   * @param alwaysOnTop - Whether window should stay on top
   * @returns Promise that resolves when property is set
   */
  public async setAlwaysOnTop(
    windowType: 'audience' | 'confidence' | 'lowerThirds',
    alwaysOnTop: boolean
  ): Promise<void> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (win) {
        win.setAlwaysOnTop(alwaysOnTop);
        this.log('info', `${windowType} window always on top: ${alwaysOnTop}`);
      }
    } catch (error) {
      this.handleError('setAlwaysOnTop', error);
    }
  }

  /**
   * Check if window is visible
   * @param windowType - Type of window to check
   * @returns Promise that resolves to visibility status
   */
  public async isWindowVisible(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<boolean> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      return win ? win.isVisible() : false;
    } catch (error) {
      this.log('warn', `Error checking ${windowType} window visibility:`, error);
      return false;
    }
  }

  /**
   * Get window state
   * @param windowType - Type of window
   * @returns Promise that resolves to window state
   */
  public async getWindowState(windowType: 'audience' | 'confidence' | 'lowerThirds'): Promise<WindowState | null> {
    try {
      const getter = this.getWindowGetterByType(windowType);
      const win = this.getWindow(getter, windowType);
      
      if (!win) {
        return null;
      }

      const bounds = win.getBounds();
      return {
        isVisible: win.isVisible(),
        isFullScreen: win.isFullScreen(),
        isMinimized: win.isMinimized(),
        isMaximized: win.isMaximized(),
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      };
    } catch (error) {
      this.handleError('getWindowState', error);
    }
  }

  /**
   * Get all windows status
   * @returns Promise that resolves to status of all windows
   */
  public async getAllWindowsStatus(): Promise<{
    audience: { visible: boolean; exists: boolean };
    confidence: { visible: boolean; exists: boolean };
    lowerThirds: { visible: boolean; exists: boolean };
  }> {
    try {
      const audienceWin = this.audienceWindowGetter?.();
      const confidenceWin = this.confidenceWindowGetter?.();
      const lowerThirdsWin = this.lowerThirdsWindowGetter?.();

      return {
        audience: {
          visible: audienceWin ? audienceWin.isVisible() : false,
          exists: audienceWin !== null && audienceWin !== undefined
        },
        confidence: {
          visible: confidenceWin ? confidenceWin.isVisible() : false,
          exists: confidenceWin !== null && confidenceWin !== undefined
        },
        lowerThirds: {
          visible: lowerThirdsWin ? lowerThirdsWin.isVisible() : false,
          exists: lowerThirdsWin !== null && lowerThirdsWin !== undefined
        }
      };
    } catch (error) {
      this.handleError('getAllWindowsStatus', error);
    }
  }

  /**
   * Hide all windows
   * @returns Promise that resolves when all windows are hidden
   */
  public async hideAllWindows(): Promise<void> {
    try {
      await Promise.all([
        this.hideAudience(),
        this.hideConfidence(),
        this.hideLowerThirds()
      ]);
      this.log('info', 'All windows hidden');
    } catch (error) {
      this.handleError('hideAllWindows', error);
    }
  }

  /**
   * Show all windows
   * @returns Promise that resolves when all windows are shown
   */
  public async showAllWindows(): Promise<void> {
    try {
      await Promise.all([
        this.showAudience(),
        this.showConfidence(),
        this.showLowerThirds()
      ]);
      this.log('info', 'All windows shown');
    } catch (error) {
      this.handleError('showAllWindows', error);
    }
  }

  /**
   * Get window by type
   * @param getter - Window getter function
   * @param windowType - Type of window (for logging)
   * @returns Browser window or null
   */
  private getWindow(getter: WindowGetter | undefined, windowType: string): BrowserWindow | null {
    if (!getter) {
      this.log('warn', `${windowType} window getter not registered`);
      return null;
    }
    
    const win = getter();
    if (!win) {
      this.log('warn', `${windowType} window not found`);
    }
    return win;
  }

  /**
   * Get window getter by type
   * @param windowType - Type of window
   * @returns Window getter function
   */
  private getWindowGetterByType(windowType: 'audience' | 'confidence' | 'lowerThirds'): WindowGetter | undefined {
    switch (windowType) {
      case 'audience':
        return this.audienceWindowGetter;
      case 'confidence':
        return this.confidenceWindowGetter;
      case 'lowerThirds':
        return this.lowerThirdsWindowGetter;
      default:
        throw new Error(`Unknown window type: ${windowType}`);
    }
  }
}

// Export singleton instance
let windowServiceInstance: WindowService | null = null;

/**
 * Get or create the window service singleton
 */
export function getWindowService(config?: ServiceConfig): WindowService {
  if (!windowServiceInstance) {
    windowServiceInstance = new WindowService(config);
  }
  return windowServiceInstance;
}

// Export for backward compatibility
export default WindowService;
