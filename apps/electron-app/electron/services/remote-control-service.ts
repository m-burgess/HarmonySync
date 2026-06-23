/**
 * Remote Control Service
 * Provides a REST API for controlling HarmonySync Presenter from mobile devices
 */

import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import { Server } from 'http';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { BrowserWindow, app } from 'electron';
import { WebSocketServer, WebSocket } from 'ws';
import { BaseElectronService, IRemoteControlService, ServiceConfig } from '@harmonysync/core';

/**
 * Rate limit record structure
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Application state interface
 */
interface AppState {
  currentFolder: string | null;
  currentSlideIndex: number;
  totalSlides: number;
  playbackStatus: 'playing' | 'stopped' | 'paused';
  playbackPosition: number;
  loadedTracks: string[];
  setlistDirectory: string | null;
  currentSongName?: string;
  currentSongPath?: string;
  currentSongMap?: any;
}

/**
 * API response interface
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Window getter function type
 */
type WindowGetter = () => BrowserWindow | null;

// Rate limiting constants
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

/**
 * Remote Control Service Implementation
 * Provides REST API for remote control of presentations and playback
 */
export class RemoteControlService extends BaseElectronService implements IRemoteControlService {
  protected readonly serviceName = 'RemoteControlService';

  private server: Server | null = null;
  private app: Application | null = null;
  private getMainWindow: WindowGetter;
  private readonly port: number;
  private cachedIPAddress: string | null = null;
  private rateLimitMap: Map<string, RateLimitRecord> = new Map();
  private wss: WebSocketServer | null = null;

  // Application state
  private appState: AppState = {
    currentFolder: null,
    currentSlideIndex: 0,
    totalSlides: 0,
    playbackStatus: 'stopped',
    playbackPosition: 0,
    loadedTracks: [],
    setlistDirectory: null
  };

  constructor(getMainWindow: WindowGetter, port: number = 3000, config?: ServiceConfig) {
    super(config);
    this.getMainWindow = getMainWindow;
    this.port = port;
    this.startRateLimitCleanup();
  }

  /**
   * Initialize the remote control service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Remote control service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.app = null;
    }
    this.rateLimitMap.clear();
    this.log('info', 'Remote control service disposed');
  }

  /**
   * Start the remote control REST API server
   * @param port - Optional port override
   */
  public async start(port?: number): Promise<void> {
    const serverPort = port || this.port;

    if (this.server) {
      this.log('warn', 'Remote control server already running');
      return;
    }

    this.app = express();

    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Apply rate limiting to API routes
    this.app.use('/api', this.createRateLimiter());

    // Serve Musician View from mobile-app/dist
    const isPackaged = app.isPackaged;
    const musicianViewDir = isPackaged
      ? path.join(process.resourcesPath, 'mobile-app/dist')
      : path.join(__dirname, '../../../../mobile-app/dist');
    this.app.use(express.static(musicianViewDir));
    this.log('info', `Serving Musician View from: ${musicianViewDir}`);

    // Logging middleware
    this.app.use(this.createLoggingMiddleware());

    // Setup routes
    this.setupRoutes();

    // Error handling middleware
    this.app.use(this.createErrorHandler());

    // Start server
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(serverPort, '0.0.0.0', (err?: Error) => {
          if (err) {
            this.log('error', 'Failed to start remote control server:', err);
            reject(err);
          } else {
            const ipAddress = this.getLocalIPAddress();
            this.log('info', `Remote control server listening on:`);
            this.log('info', `  - Local:   http://localhost:${serverPort}`);
            this.log('info', `  - Network: http://${ipAddress}:${serverPort}`);
            this.log('info', `  - Mobile:  http://${ipAddress}:${serverPort}/mobile-control.html`);

            // Initialize WebSocket server
            this.wss = new WebSocketServer({ server: this.server! });
            this.wss.on('connection', (ws: WebSocket) => {
              this.log('info', 'New musician device connected via WebSocket');
              // Send current state on connection
              ws.send(JSON.stringify({ type: 'state', data: this.appState }));

              ws.on('message', (message: string) => {
                this.log('debug', `Received message from musician device: ${message}`);
                // Handle incoming messages from musicians if needed (e.g. key selection)
              });
            });

            this.emit('started', { port: serverPort, ipAddress });
            resolve();
          }
        });
      } catch (error) {
        this.handleError('start', error);
      }
    });
  }

  /**
   * Stop the remote control server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.log('info', 'Remote control server stopped');
          this.server = null;
          this.app = null;
          this.emit('stopped');
          resolve();
        });
      });
    }
    // Server not running, nothing to stop
    return Promise.resolve();
  }

  /**
   * Get the server status
   */
  public async getStatus(): Promise<{ running: boolean; urls?: { local: string; network: string; mobile: string } }> {
    if (this.server) {
      return {
        running: true,
        urls: this.getUrl()
      };
    }
    return { running: false };
  }

  /**
   * Get the server URLs
   */
  private getUrl(): { local: string; network: string; mobile: string } {
    const ipAddress = this.getLocalIPAddress();

    return {
      local: `http://localhost:${this.port}`,
      network: `http://${ipAddress}:${this.port}`,
      mobile: `http://${ipAddress}:${this.port}/mobile-control.html`
    };
  }

  /**
   * Update application state (called from IPC handlers)
   */
  public updateState(updates: Partial<AppState>): void {
    const folderChanged = updates.currentFolder !== undefined && updates.currentFolder !== this.appState.currentFolder;
    
    Object.assign(this.appState, updates);
    this.emit('state-updated', this.appState);

    // Broadcast state to all connected WebSocket clients
    if (this.wss) {
      const message = JSON.stringify({ type: 'state', data: this.appState });
      this.wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }

    // Automatically load song map if folder changed
    if (folderChanged && this.appState.currentFolder) {
      this.loadCurrentSongMap(this.appState.currentFolder);
    }
  }

  private async loadCurrentSongMap(folderPath: string): Promise<void> {
    try {
      const mapPath = path.join(folderPath, 'song-map.json');
      if (await fs.pathExists(mapPath)) {
        const data = await fs.readJson(mapPath);
        const songName = path.basename(folderPath);
        // Only update if the folder hasn't changed while we were reading
        if (this.appState.currentFolder === folderPath) {
          this.updateState({ currentSongMap: data, currentSongName: songName });
        }
      }
    } catch (err) {
      console.error('[RemoteControlService] Failed to load song map:', err);
    }
  }

  /**
   * Get current application state
   */
  public getState(): AppState {
    return { ...this.appState };
  }

  /**
   * Set the setlist directory
   */
  public setSetlistDirectory(directory: string): void {
    this.appState.setlistDirectory = directory;
  }

  /**
   * Get the local network IP address
   * @returns The IP address or 'localhost' if not found
   */
  private getLocalIPAddress(): string {
    // Return cached value if available
    if (this.cachedIPAddress) {
      return this.cachedIPAddress;
    }

    const interfaces = os.networkInterfaces();

    // Try to find local IP address
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (!ifaces) continue;

      for (const iface of ifaces) {
        // Skip internal and non-IPv4 addresses
        if (!iface.internal && iface.family === 'IPv4') {
          this.cachedIPAddress = iface.address;
          return this.cachedIPAddress;
        }
      }
    }

    this.cachedIPAddress = 'localhost';
    return this.cachedIPAddress;
  }

  /**
   * Create rate limiting middleware
   */
  private createRateLimiter(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      if (!this.rateLimitMap.has(ip)) {
        this.rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
      }

      const record = this.rateLimitMap.get(ip)!;

      if (now > record.resetTime) {
        // Reset the window
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
      }

      if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later'
        } as ApiResponse);
        return;
      }

      record.count++;
      next();
    };
  }

  /**
   * Start rate limit cleanup interval
   */
  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.rateLimitMap.entries()) {
        if (now > record.resetTime) {
          this.rateLimitMap.delete(ip);
        }
      }
    }, RATE_LIMIT_WINDOW);
  }

  /**
   * Create logging middleware
   */
  private createLoggingMiddleware(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
      this.log('debug', `${req.method} ${req.path}`);
      next();
    };
  }

  /**
   * Create error handling middleware
   */
  private createErrorHandler() {
    return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      this.log('error', 'Server error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    };
  }

  /**
   * Setup all API routes
   */
  private setupRoutes(): void {
    if (!this.app) return;

    // Status routes
    this.app.get('/api/status', this.handleGetStatus.bind(this));
    this.app.get('/api/playback/status', this.handleGetPlaybackStatus.bind(this));

    // Folder routes
    this.app.get('/api/folders', this.handleGetFolders.bind(this));
    this.app.post('/api/folder/select', this.handleSelectFolder.bind(this));

    // Slide routes
    this.app.post('/api/slide/next', this.handleSlideNext.bind(this));
    this.app.post('/api/slide/previous', this.handleSlidePrevious.bind(this));

    // Playback routes
    this.app.post('/api/playback/play', this.handlePlaybackPlay.bind(this));
    this.app.post('/api/playback/stop', this.handlePlaybackStop.bind(this));
    this.app.post('/api/playback/pause', this.handlePlaybackPause.bind(this));
  }

  /**
   * GET /api/status
   * Get current application state
   */
  private handleGetStatus(_req: Request, res: Response): void {
    try {
      res.json({
        success: true,
        data: {
          currentFolder: this.appState.currentFolder,
          currentSlideIndex: this.appState.currentSlideIndex,
          totalSlides: this.appState.totalSlides,
          playbackStatus: this.appState.playbackStatus,
          playbackPosition: this.appState.playbackPosition,
          loadedTracks: this.appState.loadedTracks.map(t => ({
            name: path.basename(t),
            path: t
          }))
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error getting status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * GET /api/folders
   * List available song folders from the setlist directory
   */
  private async handleGetFolders(_req: Request, res: Response): Promise<void> {
    try {
      const setlistDir = this.appState.setlistDirectory;

      if (!setlistDir || !await fs.pathExists(setlistDir)) {
        res.json({
          success: true,
          data: [],
          message: 'No setlist directory configured'
        } as ApiResponse<unknown[]>);
        return;
      }

      const items = await fs.readdir(setlistDir);
      const folders = [];

      for (const item of items) {
        const itemPath = path.join(setlistDir, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          // Check if directory contains audio files
          const files = await fs.readdir(itemPath);
          const hasAudio = files.some(f =>
            f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')
          );

          folders.push({
            name: item,
            path: itemPath,
            hasAudio
          });
        }
      }

      res.json({
        success: true,
        data: folders
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error listing folders:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/folder/select
   * Select and load a folder
   */
  private async handleSelectFolder(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath } = req.body;

      if (!folderPath) {
        res.status(400).json({
          success: false,
          error: 'folderPath is required'
        } as ApiResponse);
        return;
      }

      if (!await fs.pathExists(folderPath)) {
        res.status(404).json({
          success: false,
          error: 'Folder not found'
        } as ApiResponse);
        return;
      }

      // Update state
      this.appState.currentFolder = folderPath;
      this.appState.currentSlideIndex = 0;

      // Scan for slides and audio files
      const files = await fs.readdir(folderPath);
      const slideFiles = files.filter(f =>
        f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
      ).sort();

      const audioFiles = files.filter(f =>
        f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')
      ).map(f => path.join(folderPath, f));

      this.appState.totalSlides = slideFiles.length;
      this.appState.loadedTracks = audioFiles;

      // Notify main window
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('remote:folder-selected', {
          folderPath,
          slides: slideFiles,
          audioTracks: audioFiles
        });
      }

      res.json({
        success: true,
        data: {
          folderPath: this.appState.currentFolder,
          totalSlides: this.appState.totalSlides,
          audioTracks: this.appState.loadedTracks.length
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error selecting folder:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/slide/next
   * Advance to next slide
   */
  private handleSlideNext(_req: Request, res: Response): void {
    try {
      if (!this.appState.currentFolder) {
        res.status(400).json({
          success: false,
          error: 'No folder loaded'
        } as ApiResponse);
        return;
      }

      if (this.appState.currentSlideIndex < this.appState.totalSlides - 1) {
        this.appState.currentSlideIndex++;

        // Notify main window
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('remote:slide-next', {
            slideIndex: this.appState.currentSlideIndex
          });
        }

        res.json({
          success: true,
          data: {
            currentSlideIndex: this.appState.currentSlideIndex,
            totalSlides: this.appState.totalSlides
          }
        } as ApiResponse);
      } else {
        res.json({
          success: false,
          message: 'Already at last slide'
        } as ApiResponse);
      }
    } catch (error) {
      this.log('error', 'Error advancing slide:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/slide/previous
   * Go to previous slide
   */
  private handleSlidePrevious(_req: Request, res: Response): void {
    try {
      if (!this.appState.currentFolder) {
        res.status(400).json({
          success: false,
          error: 'No folder loaded'
        } as ApiResponse);
        return;
      }

      if (this.appState.currentSlideIndex > 0) {
        this.appState.currentSlideIndex--;

        // Notify main window
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('remote:slide-previous', {
            slideIndex: this.appState.currentSlideIndex
          });
        }

        res.json({
          success: true,
          data: {
            currentSlideIndex: this.appState.currentSlideIndex,
            totalSlides: this.appState.totalSlides
          }
        } as ApiResponse);
      } else {
        res.json({
          success: false,
          message: 'Already at first slide'
        } as ApiResponse);
      }
    } catch (error) {
      this.log('error', 'Error going to previous slide:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/playback/play
   * Start multitrack playback
   */
  private handlePlaybackPlay(_req: Request, res: Response): void {
    try {
      if (this.appState.loadedTracks.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No audio tracks loaded'
        } as ApiResponse);
        return;
      }

      this.appState.playbackStatus = 'playing';

      // Notify main window
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('remote:playback-play');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: this.appState.playbackStatus
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error starting playback:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/playback/stop
   * Stop multitrack playback
   */
  private handlePlaybackStop(_req: Request, res: Response): void {
    try {
      this.appState.playbackStatus = 'stopped';
      this.appState.playbackPosition = 0;

      // Notify main window
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('remote:playback-stop');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: this.appState.playbackStatus
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error stopping playback:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * POST /api/playback/pause
   * Pause multitrack playback
   */
  private handlePlaybackPause(_req: Request, res: Response): void {
    try {
      this.appState.playbackStatus = 'paused';

      // Notify main window
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('remote:playback-pause');
      }

      res.json({
        success: true,
        data: {
          playbackStatus: this.appState.playbackStatus
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error pausing playback:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * GET /api/playback/status
   * Get current playback status
   */
  private handleGetPlaybackStatus(_req: Request, res: Response): void {
    try {
      res.json({
        success: true,
        data: {
          status: this.appState.playbackStatus,
          position: this.appState.playbackPosition,
          tracksLoaded: this.appState.loadedTracks.length
        }
      } as ApiResponse);
    } catch (error) {
      this.log('error', 'Error getting playback status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }
}

// Export for backward compatibility
export function createRemoteControlService(
  getMainWindow: WindowGetter,
  port?: number,
  config?: ServiceConfig
): RemoteControlService {
  return new RemoteControlService(getMainWindow, port, config);
}

// Singleton instance for backward compatibility with function-based API
let defaultInstance: RemoteControlService | null = null;

// Export function-based API for backward compatibility
export function initialize(getMainWindow: WindowGetter): void {
  if (!defaultInstance) {
    defaultInstance = new RemoteControlService(getMainWindow);
  }
}

export async function start(port?: number): Promise<void> {
  if (!defaultInstance) {
    throw new Error('Remote control service not initialized. Call initialize() first.');
  }
  return defaultInstance.start(port);
}

export async function stop(): Promise<void> {
  if (!defaultInstance) {
    // Service was never initialized, nothing to stop
    return Promise.resolve();
  }
  return defaultInstance.stop();
}

export function getUrl(): { local: string; network: string; mobile: string } {
  if (!defaultInstance) {
    throw new Error('Remote control service not initialized.');
  }
  // Access the private method through the proper API
  const port = (defaultInstance as any).port;
  const ipAddress = (defaultInstance as any).getLocalIPAddress();
  return {
    local: `http://localhost:${port}`,
    network: `http://${ipAddress}:${port}`,
    mobile: `http://${ipAddress}:${port}/mobile-control.html`
  };
}

export function updateState(updates: Partial<AppState>): void {
  if (!defaultInstance) {
    throw new Error('Remote control service not initialized.');
  }
  defaultInstance.updateState(updates);
}

export function getState(): AppState {
  if (!defaultInstance) {
    throw new Error('Remote control service not initialized.');
  }
  return defaultInstance.getState();
}

export function setSetlistDirectory(directory: string): void {
  if (!defaultInstance) {
    throw new Error('Remote control service not initialized.');
  }
  defaultInstance.setSetlistDirectory(directory);
}
