/**
 * Display Service
 * Handles coordination of content display across multiple windows
 * (audience, confidence, lower thirds)
 */

import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import { BaseElectronService } from '@harmonysync/core';
import { IDisplayService, ServiceConfig } from '@harmonysync/core';
import { SlideContent, LowerThirdsData } from '@harmonysync/core';

/**
 * Window getter function type
 */
type WindowGetter = () => BrowserWindow | null;

/**
 * Display Service Implementation
 * Coordinates content display across multiple display windows
 */
export class DisplayService extends BaseElectronService implements IDisplayService {
  protected readonly serviceName = 'DisplayService';

  private getAudienceWindow: WindowGetter;
  private getConfidenceWindow: WindowGetter;
  private getLowerThirdsWindow: WindowGetter;

  private audienceWindow: BrowserWindow | null = null;
  private confidenceWindow: BrowserWindow | null = null;
  private lowerThirdsWindow: BrowserWindow | null = null;
  private preserviceMusicWindow: BrowserWindow | null = null;
  private isAppQuitting = false;

  // Display State Persistence
  private currentState = {
    video: null as { path: string; duration?: number; loop?: boolean } | null,
    slide: null as SlideContent | null,
    blackout: false,
    lowerThirds: null as LowerThirdsData | null
  };

  public getPreserviceMusicWindow(): BrowserWindow | null {
    return this.preserviceMusicWindow;
  }

  constructor(
    getAudienceWindow: WindowGetter,
    getConfidenceWindow: WindowGetter,
    getLowerThirdsWindow: WindowGetter,
    config?: ServiceConfig
  ) {
    super(config);
    this.getAudienceWindow = getAudienceWindow;
    this.getConfidenceWindow = getConfidenceWindow;
    this.getLowerThirdsWindow = getLowerThirdsWindow;
  }

  /**
   * Initialize the display service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Display service ready');

    app.on('before-quit', () => {
      this.isAppQuitting = true;
    });

    // Auto-initialize windows when app is ready
    if (app.isReady()) {
      await this.initializeWindows();
    } else {
      app.whenReady().then(() => this.initializeWindows());
    }
  }

  /**
   * Create and configure all application windows
   */
  public async initializeWindows(): Promise<void> {
    this.log('info', 'Initializing application windows');

    const isDev = process.env.NODE_ENV === 'development';
    const ANGULAR_DEV_SERVER_URL = 'http://localhost:4200';
    // Adjust path based on compiled structure
    const preloadPath = path.join(__dirname, '../../preload.js');

    // Create Audience Window
    this.audienceWindow = this.createSecondaryWindow(preloadPath, {
      width: 960,
      height: 540,
      title: 'Audience'
    });
    this.loadWindowContent(this.audienceWindow, 'audience', isDev, ANGULAR_DEV_SERVER_URL);

    // Create Confidence Monitor
    this.confidenceWindow = this.createSecondaryWindow(preloadPath, {
      width: 960,
      height: 540,
      title: 'Confidence Monitor'
    });
    this.loadWindowContent(this.confidenceWindow, 'confidence', isDev, ANGULAR_DEV_SERVER_URL);

    // Create Lower Thirds
    this.lowerThirdsWindow = this.createSecondaryWindow(preloadPath, {
      width: 960,
      height: 540,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      title: 'Lower Thirds Overlay'
    });
    this.loadWindowContent(this.lowerThirdsWindow, 'lower-thirds', isDev, ANGULAR_DEV_SERVER_URL);

    // Create Preservice Music
    this.preserviceMusicWindow = this.createSecondaryWindow(preloadPath, {
      width: 800,
      height: 600,
      title: 'Pre-service Music'
    });
    this.loadWindowContent(this.preserviceMusicWindow, 'preservice', isDev, ANGULAR_DEV_SERVER_URL);

    // Update getters to use our locally managed windows
    this.getAudienceWindow = () => this.audienceWindow;
    this.getConfidenceWindow = () => this.confidenceWindow;
    this.getLowerThirdsWindow = () => this.lowerThirdsWindow;

    this.log('info', 'All windows initialized and routed');
  }

  private createSecondaryWindow(preloadPath: string, options: any): BrowserWindow {
    const win = new BrowserWindow({
      ...options,
      show: false, // Don't show until explicitly requested or content loaded
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
    });

    win.on('close', (e) => {
      if (!this.isAppQuitting) {
        e.preventDefault();
        win.hide();
        this.log('debug', `Intercepted close event for secondary window, hiding instead`);
      }
    });

    return win;
  }

  private loadWindowContent(window: BrowserWindow, route: string, isDev: boolean, devUrl: string): void {
    if (isDev) {
      window.loadURL(`${devUrl}#/${route}`);
    } else {
      window.loadFile(
        path.join(__dirname, '../../../angular-renderer/dist/angular-renderer/browser/index.html'),
        { hash: `/${route}` }
      );
    }
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Display service disposed');
  }

  /**
   * Display video slide on audience and confidence windows
   * @param path - Path to video file
   * @param duration - Video duration in seconds (optional)
   * @param loop - Whether to loop the video (optional)
   */
  public async displayVideoSlide(path: string, duration?: number, loop?: boolean): Promise<void> {
    try {
      this.currentState.video = { path, duration, loop };
      this.currentState.slide = null; // Video usually replaces or is background to slide
      this.currentState.blackout = false;

      const audWin = this.getAudienceWindow();
      const confWin = this.getConfidenceWindow();

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send('display-video-slide', { path, loop });
        this.log('debug', `Sent video slide to audience window: ${path} (loop: ${loop})`);
      }

      if (confWin && !confWin.isDestroyed() && duration !== undefined) {
        confWin.webContents.send('start-video-countdown', duration);
        this.log('debug', `Started video countdown on confidence monitor: ${duration}s`);
      }

      this.emit('video-displayed', { path, duration });
    } catch (error) {
      this.handleError('displayVideoSlide', error);
    }
  }

  /**
   * Display slide content on all windows
   * @param content - Slide content object
   */
  public async displaySlide(content: SlideContent): Promise<void> {
    try {
      this.currentState.slide = content;
      this.currentState.blackout = false;

      const audWin = this.getAudienceWindow();
      const confWin = this.getConfidenceWindow();
      const lowerWin = this.getLowerThirdsWindow();

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send('display-slide', content);
        this.log('debug', `Sent slide to audience window: ${content.type}`);
      }

      if (confWin && !confWin.isDestroyed()) {
        confWin.webContents.send('display-slide', content);
        this.log('debug', `Sent slide to confidence window: ${content.type}`);
      }

      // Handle lower thirds if included in content
      if (lowerWin && !lowerWin.isDestroyed() && 'lowerThirds' in content) {
        const lowerThirdsData = (content as any).lowerThirds;
        this.currentState.lowerThirds = lowerThirdsData;
        lowerWin.webContents.send('update-lower-thirds', lowerThirdsData);
        this.log('debug', 'Sent lower thirds data');
      }

      this.emit('slide-displayed', content);
    } catch (error) {
      this.handleError('displaySlide', error);
    }
  }

  /**
   * Display black screen on audience window
   */
  public async blackScreen(): Promise<void> {
    try {
      this.currentState.blackout = true;
      const audWin = this.getAudienceWindow();

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send('display-black-screen');
        this.log('debug', 'Displayed black screen on audience window');
      }

      this.emit('black-screen-displayed');
    } catch (error) {
      this.handleError('blackScreen', error);
    }
  }

  /**
   * Clear all displays
   */
  public async clearAll(): Promise<void> {
    try {
      this.currentState.video = null;
      this.currentState.slide = null;
      this.currentState.blackout = false;
      this.currentState.lowerThirds = null;

      const audWin = this.getAudienceWindow();
      const confWin = this.getConfidenceWindow();
      const lowerWin = this.getLowerThirdsWindow();

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send('clear-display');
        this.log('debug', 'Cleared audience window');
      }

      if (confWin && !confWin.isDestroyed()) {
        confWin.webContents.send('clear-display');
        this.log('debug', 'Cleared confidence window');
      }

      if (lowerWin && !lowerWin.isDestroyed()) {
        lowerWin.webContents.send('clear-display');
        this.log('debug', 'Cleared lower thirds window');
      }

      this.emit('displays-cleared');
    } catch (error) {
      this.handleError('clearAll', error);
    }
  }

  /**
   * Update lower thirds text
   * @param data - Lower thirds data object
   */
  public async updateLowerThirds(data: LowerThirdsData): Promise<void> {
    try {
      this.currentState.lowerThirds = data;
      const lowerWin = this.getLowerThirdsWindow();

      if (lowerWin && !lowerWin.isDestroyed()) {
        lowerWin.webContents.send('update-lower-thirds', data);
        this.log('debug', 'Updated lower thirds');
      }

      this.emit('lower-thirds-updated', data);
    } catch (error) {
      this.handleError('updateLowerThirds', error);
    }
  }

  /**
   * Get current display state
   */
  public getCurrentState(): any {
    return this.currentState;
  }

  /**
   * Send custom message to specific display
   * @param windowType - Type of window ('audience', 'confidence', 'lower-thirds')
   * @param channel - IPC channel name
   * @param data - Data to send
   */
  public async sendToDisplay(
    windowType: 'audience' | 'confidence' | 'lower-thirds',
    channel: string,
    data: any
  ): Promise<void> {
    try {
      let win: BrowserWindow | null = null;

      switch (windowType) {
        case 'audience':
          win = this.getAudienceWindow();
          break;
        case 'confidence':
          win = this.getConfidenceWindow();
          break;
        case 'lower-thirds':
          win = this.getLowerThirdsWindow();
          break;
      }

      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data);
        this.log('debug', `Sent message to ${windowType} window on channel ${channel}`);
      } else {
        this.log('warn', `${windowType} window not available`);
      }
    } catch (error) {
      this.handleError(`sendToDisplay(${windowType}, ${channel})`, error);
    }
  }

  /**
   * Broadcast message to all displays
   * @param channel - IPC channel name
   * @param data - Data to send
   */
  public async broadcast(channel: string, data: any): Promise<void> {
    try {
      const audWin = this.getAudienceWindow();
      const confWin = this.getConfidenceWindow();
      const lowerWin = this.getLowerThirdsWindow();

      let sentCount = 0;

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send(channel, data);
        sentCount++;
      }

      if (confWin && !confWin.isDestroyed()) {
        confWin.webContents.send(channel, data);
        sentCount++;
      }

      if (lowerWin && !lowerWin.isDestroyed()) {
        lowerWin.webContents.send(channel, data);
        sentCount++;
      }

      this.log('debug', `Broadcast message on channel ${channel} to ${sentCount} windows`);
      this.emit('broadcast-sent', { channel, data, count: sentCount });
    } catch (error) {
      this.handleError(`broadcast(${channel})`, error);
    }
  }

  /**
   * Broadcast message to specific display targets
   * @param targets - Array of targets ('audience', 'confidence', 'lower-thirds')
   * @param channel - IPC channel name
   * @param data - Data to send
   */
  public async broadcastToTargets(
    targets: string[],
    channel: string,
    data: any
  ): Promise<void> {
    try {
      let sentCount = 0;
      const validTargets = targets.map(t => t.toLowerCase());

      const targetMap: Record<string, () => BrowserWindow | null> = {
        'audience': this.getAudienceWindow.bind(this),
        'confidence': this.getConfidenceWindow.bind(this),
        'lowerthirds': this.getLowerThirdsWindow.bind(this),
        'lower-thirds': this.getLowerThirdsWindow.bind(this),
        'both': () => null, // Special case handled below
      };

      if (validTargets.includes('both')) {
        await this.broadcast(channel, data);
        return;
      }

      for (const target of validTargets) {
        const getWin = targetMap[target];
        if (getWin) {
          const win = getWin();
          if (win && !win.isDestroyed()) {
            win.webContents.send(channel, data);
            sentCount++;
          }
        }
      }

      this.log('debug', `Targeted broadcast on channel ${channel} to ${sentCount} windows (Targets: ${targets.join(', ')})`);
      this.emit('broadcast-sent', { channel, data, count: sentCount, targets });
    } catch (error) {
      this.handleError(`broadcastToTargets(${targets.join(',')}, ${channel})`, error);
    }
  }

  /**
   * Check if a specific window is available
   * @param windowType - Type of window to check
   * @returns True if window exists and is not destroyed
   */
  public isWindowAvailable(windowType: 'audience' | 'confidence' | 'lower-thirds'): boolean {
    let win: BrowserWindow | null = null;

    switch (windowType) {
      case 'audience':
        win = this.getAudienceWindow();
        break;
      case 'confidence':
        win = this.getConfidenceWindow();
        break;
      case 'lower-thirds':
        win = this.getLowerThirdsWindow();
        break;
    }

    return win !== null && !win.isDestroyed();
  }

  /**
   * Get count of available display windows
   */
  public getAvailableWindowsCount(): number {
    let count = 0;

    if (this.isWindowAvailable('audience')) count++;
    if (this.isWindowAvailable('confidence')) count++;
    if (this.isWindowAvailable('lower-thirds')) count++;

    return count;
  }

  /**
   * Update window getter functions (useful if windows are recreated)
   */
  public updateWindowGetters(
    getAudienceWindow?: WindowGetter,
    getConfidenceWindow?: WindowGetter,
    getLowerThirdsWindow?: WindowGetter
  ): void {
    if (getAudienceWindow) {
      this.getAudienceWindow = getAudienceWindow;
      this.log('debug', 'Updated audience window getter');
    }
    if (getConfidenceWindow) {
      this.getConfidenceWindow = getConfidenceWindow;
      this.log('debug', 'Updated confidence window getter');
    }
    if (getLowerThirdsWindow) {
      this.getLowerThirdsWindow = getLowerThirdsWindow;
      this.log('debug', 'Updated lower thirds window getter');
    }
  }
}

// Export for backward compatibility
export default DisplayService;
