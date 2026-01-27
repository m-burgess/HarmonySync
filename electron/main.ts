import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';

// Import backend services - using require for .js modules without type definitions
const jsonStorage = require('./services/json-storage');
const ffmpegService = require('./services/ffmpeg');
const audioService = require('./services/audio-service');
const videoService = require('./services/video-service');
const youtubeService = require('./services/youtube-service');
const imageService = require('./services/image-service');
const textService = require('./services/text-service');
const displayService = require('./services/display-service');
const windowService = require('./services/window-service');
const macroService = require('./services/macro-service');
const schedulerService = require('./services/scheduler-service');
const httpServer = require('./services/http-server');
const remoteControlService = require('./services/remote-control-service');
const lyricsFetcher = require('./services/lyrics-fetcher');
const fileManager = require('./services/file-manager');
const googleDriveService = require('./services/google-drive');
const dropboxService = require('./services/dropbox-service');
const scriptService = require('./services/script-service');
const scriptingAPI = require('./services/scripting-api');
const slidesService = require('./services/slides-service');
const displayConfigService = require('./services/display-config-service');

// MIDI manager with optional loading
let midiManager: any = null;
try {
  midiManager = require('./services/midi-manager');
} catch (e: unknown) {
  const error = e as Error;
  console.warn('MIDI manager failed to load:', error?.message || String(e));
}

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = 'http://localhost:5174';

/**
 * Window configuration interface
 */
interface WindowConfig {
  width: number;
  height: number;
  frame?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  show?: boolean;
}

/**
 * Service Process Manager
 * Handles lifecycle of external service processes
 */
class ServiceProcessManager {
  private processes: Map<string, ChildProcess> = new Map();

  /**
   * Start a Node.js service process
   */
  public async startService(
    name: string,
    servicePath: string,
    env: Record<string, string>,
    timeoutMs: number = 10000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const serviceProcess = spawn('node', [servicePath], {
        env: {
          ...process.env,
          ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.processes.set(name, serviceProcess);

      serviceProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`${name}: ${output}`);
        if (!resolved && output.includes('listening')) {
          resolved = true;
          resolve();
        }
      });

      serviceProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`${name} Error: ${data.toString()}`);
      });

      serviceProcess.on('error', (error: Error) => {
        console.error(`Failed to start ${name}:`, error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      serviceProcess.on('exit', (code: number | null) => {
        console.log(`${name} exited with code ${code}`);
        this.processes.delete(name);
        if (!resolved && code !== 0) {
          resolved = true;
          reject(new Error(`${name} exited with code ${code}`));
        }
      });

      // Timeout with warning instead of silent success
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[ServiceProcessManager] ${name} did not report ready within ${timeoutMs}ms, assuming started`);
          resolve();
        }
      }, timeoutMs);
    });
  }

  /**
   * Stop a service process
   */
  public async stopService(name: string): Promise<void> {
    const process = this.processes.get(name);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(name);
    }
  }

  /**
   * Stop all services
   */
  public async stopAllServices(): Promise<void> {
    const stopPromises = Array.from(this.processes.keys()).map((name) =>
      this.stopService(name)
    );
    await Promise.all(stopPromises);
  }
}

/**
 * Main Application Manager
 * Handles window creation, service initialization, and app lifecycle
 */
class ElectronApplication {
  private mainWindow: BrowserWindow | null = null;
  private audienceWindow: BrowserWindow | null = null;
  private confidenceWindow: BrowserWindow | null = null;
  private lowerThirdsWindow: BrowserWindow | null = null;
  private serviceManager: ServiceProcessManager;

  constructor() {
    this.serviceManager = new ServiceProcessManager();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[Application] Initializing...');

      // Register IPC handlers FIRST (before creating windows)
      this.setupIpcHandlers();

      // Create windows
      this.createMainWindow();
      this.createAudienceWindow();
      this.createConfidenceWindow();
      this.createLowerThirdsWindow();

      // Start external services (audio, video, image)
      await this.startExternalServices();

      console.log('[Application] Initialized successfully');
    } catch (error) {
      console.error('[Application] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create the main application window
   */
  private createMainWindow(): void {
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('[MainWindow] Preload path:', preloadPath);
    console.log('[MainWindow] Preload exists:', fs.existsSync(preloadPath));

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: preloadPath,
      },
      icon: path.join(__dirname, '../harmonysync/icons/icon.png'),
    });

    this.setupMainWindowMenu();
    this.setupMainWindowHandlers();
    this.loadMainWindowContent();
  }

  /**
   * Setup main window menu
   */
  private setupMainWindowMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [{ role: 'quit' }],
      },
      {
        label: 'Settings',
        submenu: [
          {
            label: 'Display Settings',
            click: () => {
              this.mainWindow?.webContents.send('display-settings-clicked');
            },
          },
          {
            label: 'Audio Settings',
            click: () => {
              this.mainWindow?.webContents.send('audio-settings-clicked');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * Setup main window event handlers
   */
  private setupMainWindowHandlers(): void {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[MainWindow] Page finished loading');

      // Check if preload executed successfully
      this.mainWindow?.webContents
        .executeJavaScript(`
          console.log('[MainWindow-Injection] Checking for electronAPI...');
          console.log('[MainWindow-Injection] electronAPI:', typeof window.electronAPI);
          console.log('[MainWindow-Injection] __electronAPICached:', typeof window.__electronAPICached);
          console.log('[MainWindow-Injection] __preloadReady:', window.__preloadReady);
        `)
        .catch((err: Error) => {
          console.error('[MainWindow] Failed to execute check script:', err);
        });
    });

    this.mainWindow.on('close', async (e) => {
      e.preventDefault();

      // Close all windows
      this.audienceWindow?.close();
      this.confidenceWindow?.close();
      this.lowerThirdsWindow?.close();

      // Stop services
      await httpServer.stop();
      await remoteControlService.stop();
      await this.serviceManager.stopAllServices();

      this.mainWindow?.destroy();
      app.quit();
    });
  }

  /**
   * Load main window content
   */
  private loadMainWindowContent(): void {
    if (!this.mainWindow) return;

    if (isDev) {
      const devUrl = `${VITE_DEV_SERVER_URL}/index.html`;
      console.log('[MainWindow] Loading dev URL:', devUrl);
      this.mainWindow
        .loadURL(devUrl)
        .then(() => {
          console.log('[MainWindow] Dev URL loaded successfully');
          this.mainWindow?.webContents.openDevTools();
        })
        .catch((err: Error) => {
          console.error('[MainWindow] Error loading dev URL:', err);
        });
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, '../harmonysync/dist/index.html')
      );
    }
  }

  /**
   * Create audience display window
   */
  private createAudienceWindow(): void {
    this.audienceWindow = this.createSecondaryWindow({
      width: 1920,
      height: 1080,
      frame: false,
      show: false,
    });

    this.loadWindowContent(this.audienceWindow, 'audience.html');
  }

  /**
   * Create confidence monitor window
   */
  private createConfidenceWindow(): void {
    this.confidenceWindow = this.createSecondaryWindow({
      width: 1920,
      height: 1080,
      frame: false,
      show: false,
    });

    this.loadWindowContent(this.confidenceWindow, 'confidence.html');

    if (isDev) {
      this.confidenceWindow.webContents.openDevTools();
    }
  }

  /**
   * Create lower thirds overlay window
   */
  private createLowerThirdsWindow(): void {
    this.lowerThirdsWindow = this.createSecondaryWindow({
      width: 1920,
      height: 1080,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      show: false,
    });

    this.loadWindowContent(this.lowerThirdsWindow, 'lowerthirds.html');
  }

  /**
   * Generic method to create secondary windows
   */
  private createSecondaryWindow(config: WindowConfig): BrowserWindow {
    return new BrowserWindow({
      ...config,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });
  }

  /**
   * Load content into a window
   */
  private loadWindowContent(window: BrowserWindow, htmlFile: string): void {
    if (isDev) {
      window.loadURL(`${VITE_DEV_SERVER_URL}/${htmlFile}`);
    } else {
      window.loadFile(path.join(__dirname, '../harmonysync/dist', htmlFile));
    }
  }

  /**
   * Start all external services
   */
  private async startExternalServices(): Promise<void> {
    console.log('[Application] Starting external services...');

    // Start audio service
    await this.serviceManager.startService(
      'Audio Service',
      path.join(__dirname, '../../harmonysync-audio-service/server.js'),
      { PORT: '3001', HOST: '127.0.0.1' }
    );

    // Start video service
    await this.serviceManager.startService(
      'Video Service',
      path.join(__dirname, '../../harmonysync-video-service/server.js'),
      { PORT: '3002', HOST: '127.0.0.1' }
    );

    // Start image service
    await this.serviceManager.startService(
      'Image Service',
      path.join(__dirname, '../../harmonysync-image-service/server.js'),
      { PORT: '3003', HOST: '127.0.0.1', MAX_CONCURRENT_JOBS: '3' }
    );

    console.log('[Application] External services started');
  }

  /**
   * Setup IPC handlers
   */
  private setupIpcHandlers(): void {
    const setupIpcHandlers = require('./ipc-handlers');
    setupIpcHandlers(ipcMain, {
      mainWindow: () => this.mainWindow,
      audienceWindow: () => this.audienceWindow,
      confidenceWindow: () => this.confidenceWindow,
      lowerThirdsWindow: () => this.lowerThirdsWindow,
      jsonStorage,
      ffmpegService,
      audioService,
      videoService,
      youtubeService,
      imageService,
      textService,
      displayService,
      windowService,
      macroService,
      schedulerService,
      httpServer,
      remoteControlService,
      midiManager,
      lyricsFetcher,
      fileManager,
      googleDriveService,
      dropboxService,
      scriptService,
      scriptingAPI,
      slidesService,
      displayConfigService,
    });
  }

  /**
   * Shutdown the application
   */
  public async shutdown(): Promise<void> {
    console.log('[Application] Shutting down services...');
    await this.serviceManager.stopAllServices();
    await httpServer.stop();
    await remoteControlService.stop();
  }

  /**
   * Get window getters for external access
   */
  public getMainWindow = (): BrowserWindow | null => this.mainWindow;
  public getAudienceWindow = (): BrowserWindow | null => this.audienceWindow;
  public getConfidenceWindow = (): BrowserWindow | null => this.confidenceWindow;
  public getLowerThirdsWindow = (): BrowserWindow | null => this.lowerThirdsWindow;
}

// ==================== Application Lifecycle ====================

const application = new ElectronApplication();

app.whenReady().then(async () => {
  try {
    await application.initialize();
  } catch (error) {
    console.error('[App] Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await application.shutdown();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    application.initialize();
  }
});

// ==================== Module Exports ====================

export {
  application,
};

// Legacy CommonJS exports for compatibility
module.exports = {
  getMainWindow: application.getMainWindow,
  getAudienceWindow: application.getAudienceWindow,
  getConfidenceWindow: application.getConfidenceWindow,
  getLowerThirdsWindow: application.getLowerThirdsWindow,
};
