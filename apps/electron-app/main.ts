import { app, BrowserWindow, ipcMain, Menu, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';

// Import backend services - using require since they will be compiled to CommonJS at runtime
const jsonStorage = require('./electron/services/json-storage');
const { getFFmpegService } = require('./electron/services/ffmpeg');
const audioService = require('./electron/services/audio-service');
const videoService = require('./electron/services/video-service');
const youtubeService = require('./electron/services/youtube-service');
const imageService = require('./electron/services/image-service');
const textService = require('./electron/services/text-service');
const displayService = require('./electron/services/display-service');
const windowService = require('./electron/services/window-service');
const macroService = require('./electron/services/macro-service');
const schedulerService = require('./electron/services/scheduler-service');
const httpServer = require('./electron/services/http-server');
const remoteControlService = require('./electron/services/remote-control-service');
const lyricsFetcher = require('./electron/services/lyrics-fetcher');
const fileManager = require('./electron/services/file-manager');
const googleDriveService = require('./electron/services/google-drive');
const dropboxService = require('./electron/services/dropbox-service');
const scriptService = require('./electron/services/script-service');
const scriptingAPI = require('./electron/services/scripting-api');
const slidesService = require('./electron/services/slides-service');
const displayConfigService = require('./electron/services/display-config-service');
const eventTriggerService = require('./electron/services/event-trigger-service');
const { ServiceOrderImporter } = require('./electron/services/service-order-importer');
const { appSettingsService } = require('./electron/services/app-settings-service');
const { getTimerService } = require('./electron/services/timer-service');

// MIDI manager with optional loading
let midiManager: any = null;
try {
  midiManager = require('./electron/services/midi-manager');
} catch (e: unknown) {
  const error = e as Error;
  console.warn('MIDI manager failed to load:', error?.message || String(e));
}

// Initialize service order importer
const serviceOrderImporter = new ServiceOrderImporter();

// Initialize FFmpeg service singleton
const ffmpegService = getFFmpegService();

// Initialize Timer service singleton
const timerService = getTimerService(jsonStorage);

// Initialize and load app settings
appSettingsService.load().catch((err: Error) => {
  console.error('Failed to load app settings:', err);
});

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = 'http://localhost:5174';

// Allow secure local file access via a custom protocol (works in dev and prod)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

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
  private displayServiceInstance: any = null;
  private windowServiceInstance: any = null;
  private serviceManager: ServiceProcessManager;  private serviceOrderManagerReady: boolean = false;
  private pendingServiceOrderItems: any[] | null = null;
  constructor() {
    this.serviceManager = new ServiceProcessManager();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[Application] Initializing...');

      // NOTE: register IPC handlers after creating windows so display/window
      // getters can be provided to services that need them.

      // Listen for service order manager ready signal
      ipcMain.on('service-order-manager-ready', () => {
        console.log('[Application] Service order manager is ready');
        this.serviceOrderManagerReady = true;
        
        // If we have pending items, send them now
        if (this.pendingServiceOrderItems && this.mainWindow && !this.mainWindow.isDestroyed()) {
          console.log('[Application] Sending pending service order items:', this.pendingServiceOrderItems.length);
          this.mainWindow.webContents.send('service-order-loaded', {
            serviceOrder: this.pendingServiceOrderItems
          });
          this.pendingServiceOrderItems = null;
        }
      });

      // Create windows
      this.createMainWindow();
      this.createAudienceWindow();
      this.createConfidenceWindow();
      this.createLowerThirdsWindow();

      // Instantiate display service with window getters if possible
      try {
        const DisplayServiceModule = require('./electron/services/display-service');
        const DisplayServiceClass = DisplayServiceModule?.default || DisplayServiceModule;
        if (typeof DisplayServiceClass === 'function') {
          this.displayServiceInstance = new DisplayServiceClass(
            () => this.audienceWindow,
            () => this.confidenceWindow,
            () => this.lowerThirdsWindow
          );
        } else {
          // Fallback: use module as-is and try to update getters
          this.displayServiceInstance = DisplayServiceModule;
          if (this.displayServiceInstance && this.displayServiceInstance.updateWindowGetters) {
            this.displayServiceInstance.updateWindowGetters(
              () => this.audienceWindow,
              () => this.confidenceWindow,
              () => this.lowerThirdsWindow
            );
          }
        }
      } catch (err) {
        console.warn('[Application] Could not instantiate display service:', err);
        this.displayServiceInstance = displayService; // fallback to original require
      }

      // Register window getters with windowService if available
      try {
        if (!this.windowServiceInstance) {
          if (windowService?.getWindowService) {
            this.windowServiceInstance = windowService.getWindowService();
          } else if (typeof windowService?.default === 'function') {
            this.windowServiceInstance = new windowService.default();
          } else if (typeof windowService === 'function') {
            this.windowServiceInstance = new windowService();
          } else {
            this.windowServiceInstance = windowService;
          }
        }

        if (this.windowServiceInstance && typeof this.windowServiceInstance.registerWindowGetters === 'function') {
          this.windowServiceInstance.registerWindowGetters(
            () => this.audienceWindow,
            () => this.confidenceWindow,
            () => this.lowerThirdsWindow
          );
        }
      } catch (err) {
        console.warn('[Application] Could not register window getters:', err);
      }

      // Register IPC handlers now that windows and display service are available
      this.setupIpcHandlers();

      // Initialize timer service
      await timerService.initialize();
      timerService.setUpdateCallback((timer: any) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('timer:updated', timer);
        }
      });

      // Start external services (audio, video, image)
      await this.startExternalServices();

      // Auto-scan for service orders if enabled
      this.performAutoScanAndImport();

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
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return;
      }

      console.log('[MainWindow] Page finished loading');

      // Check if preload executed successfully
      if (!this.mainWindow.webContents.isDestroyed()) {
        this.mainWindow.webContents
          .executeJavaScript(`
            console.log('[MainWindow-Injection] Checking for electronAPI...');
            console.log('[MainWindow-Injection] electronAPI:', typeof window.electronAPI);
            console.log('[MainWindow-Injection] __electronAPICached:', typeof window.__electronAPICached);
            console.log('[MainWindow-Injection] __preloadReady:', window.__preloadReady);
          `)
          .catch((err: Error) => {
            console.error('[MainWindow] Failed to execute check script:', err);
          });
      }
    });

    this.mainWindow.on('close', async (e) => {
      e.preventDefault();

      try {
        // Close all windows
        this.audienceWindow?.close();
        this.confidenceWindow?.close();
        this.lowerThirdsWindow?.close();

        // Stop services
        await httpServer.stop();
        await remoteControlService.stop();
        await this.serviceManager.stopAllServices();
      } catch (error) {
        console.error('[MainWindow] Error during shutdown:', error);
      } finally {
        this.mainWindow?.destroy();
        app.quit();
      }
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
        path.join(__dirname, '../renderer/dist/index.html')
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
      window.loadFile(path.join(__dirname, '../renderer/dist', htmlFile));
    }
  }

  /**
   * Start all external services
   */
  private async startExternalServices(): Promise<void> {
    // In dev mode, services are already running from the monorepo pnpm dev command
    if (isDev) {
      console.log('[Application] Skipping external service startup in dev mode (already running)');
      return;
    }

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
      path.join(__dirname, '../../harmonysync-video-service/dist/server.js'),
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
   * Auto-scan for service orders on startup if enabled
   */
  private async performAutoScanAndImport(): Promise<void> {
    try {
      // Wait a bit for services to fully stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      const settings = await appSettingsService.getServiceOrderSettings();
      
      if (!settings?.autoImportOnStartup || !settings?.watchFolder) {
        console.log('[Application] Auto-load disabled or no watch folder configured');
        return;
      }

      console.log('[Application] Auto-scanning watch folder:', settings.watchFolder);

      // Scan for service order folders (user manually unzips)
      const fs = require('fs-extra');
      const entries = await fs.readdir(settings.watchFolder, { withFileTypes: true });
      const serviceFolder = entries.find((entry: any) => entry.isDirectory());
      
      if (!serviceFolder) {
        console.log('[Application] No service order folders found');
        return;
      }

      const folderPath = require('path').join(settings.watchFolder, serviceFolder.name);
      console.log(`[Application] Found service order folder: ${serviceFolder.name}`);
      
      try {
        // Parse the service order items directly from the folder
        const items = await serviceOrderImporter.parseItems(folderPath);
        
        if (items.length > 0) {
          const itemsToSend = items.map((item: any) => ({
            id: item.id,
            name: item.name,
            path: item.path,
            type: item.type,
            config: item.config
          }));

          // Store pending items - they will be sent when the component signals it's ready
          console.log('[Application] Storing', items.length, 'items, waiting for component to be ready');
          this.pendingServiceOrderItems = itemsToSend;
        } else {
          console.log('[Application] No service items found in folder');
        }
      } catch (error) {
        console.error(`[Application] ❌ Failed to load ${folderPath}:`, error);
      }
    } catch (error) {
      console.error('[Application] Error during auto-scan:', error);
    }
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
      displayService: this.displayServiceInstance || displayService,
      windowService: this.windowServiceInstance || windowService,
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
      eventTriggerService,
      serviceOrderImporter,
      appSettingsService,
      timerService,
    });
  }

  /**
   * Shutdown the application
   */
  public async shutdown(): Promise<void> {
    console.log('[Application] Shutting down services...');
    await this.serviceManager.stopAllServices();
    
    try {
      await httpServer.stop();
    } catch (error) {
      console.error('[Application] Error stopping HTTP server:', error);
    }
    
    try {
      await remoteControlService.stop();
    } catch (error) {
      console.error('[Application] Error stopping remote control service:', error);
    }
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
    protocol.registerFileProtocol('local', (request, callback) => {
      try {
        let urlPath = request.url.replace(/^local:\/\//, '');
        urlPath = decodeURIComponent(urlPath);
        if (/^[A-Za-z]\//.test(urlPath)) {
          urlPath = `${urlPath[0].toUpperCase()}:/${urlPath.slice(2)}`;
        }
        if (process.platform === 'win32' && urlPath.startsWith('/') && /^[A-Za-z]:/.test(urlPath.slice(1))) {
          urlPath = urlPath.slice(1);
        }
        callback({ path: urlPath });
      } catch (error) {
        console.error('[Protocol] Failed to resolve local URL:', request.url, error);
        callback({ error: -6 });
      }
    });
    console.log('[Protocol] local:// scheme registered');
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
