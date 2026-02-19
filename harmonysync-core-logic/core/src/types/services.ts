/**
 * Service Interface Definitions
 * Base interfaces and abstract classes for Electron services
 */

import { EventEmitter } from 'events';
import { DisplayConfig } from './models';

// ==================== Base Service Interface ====================

/**
 * Base interface that all services should implement
 */
export interface IService {
  /**
   * Initialize the service
   */
  initialize(): Promise<void>;

  /**
   * Clean up and dispose of service resources
   */
  dispose(): void;

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean;
}

// ==================== Service Config Interface ====================

export interface ServiceConfig {
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  [key: string]: any;
}

// (rest of file is identical to original electron/types/services.ts)

export interface IAudioService extends IService {
  convertToOgg(inputPath: string, outputDir: string, onProgress?: (progress: number) => void): Promise<string>;
  transposeAudio(songPath: string, semitones: number): Promise<string>;
  getMetadata(filePath: string): Promise<any>;
  normalize(inputPath: string, outputPath: string): Promise<void>;
  ensureSync(audioFiles: string[]): Promise<void>;
}

export interface IVideoService extends IService {
  getMetadata(filePath: string): Promise<any>;
  transcode(inputPath: string, outputPath?: string): Promise<string>;
  generateThumbnail(videoPath: string, outputPath?: string): Promise<string>;
}

export interface IImageService extends IService {
  addTextOverlay(imagePath: string, text: string, options?: any): Promise<string>;
  generateThumbnail(imagePath: string, size?: { width: number; height: number }): Promise<string>;
  clearCache(): Promise<void>;
  importPPTX(pptxPath: string, outputDir: string): Promise<string[]>;
  importPDF(pdfPath: string, outputDir: string): Promise<string[]>;
}

export interface IDisplayService extends IService {
  displaySlide(content: any): Promise<void>;
  displayVideoSlide(path: string, duration?: number): Promise<void>;
  clearAll(): Promise<void>;
  blackScreen(): Promise<void>;
  updateLowerThirds(data: any): Promise<void>;
  broadcast(event: string, data: any): Promise<void>;
}

export interface IWindowService extends IService {
  showAudience(): Promise<void>;
  hideAudience(): Promise<void>;
  showConfidence(): Promise<void>;
  hideConfidence(): Promise<void>;
  showLowerThirds(): Promise<void>;
  hideLowerThirds(): Promise<void>;
  getWindowState(windowType: string): Promise<any>;
}

export interface IFileManager extends IService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
}

export interface IStorageService extends IService {
}

export interface ICloudStorageService extends IService {
  authenticate(): Promise<boolean>;
  listFiles(folderId?: string): Promise<any[]>;
  downloadFile(fileId: string, outputPath: string): Promise<void>;
  syncFolder(folderId: string, localPath: string): Promise<void>;
}

export interface ISchedulerService extends IService {
  getEvents(startDate?: Date, endDate?: Date): Promise<any[]>;
  createEvent(event: any): Promise<string>;
  updateEvent(id: string, event: any): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  getUpcoming(minutes?: number): Promise<any[]>;
}

export interface IMacroService extends IService {
  getAll(): Promise<any[]>;
  create(macro: any): Promise<string>;
  update(id: string, macro: any): Promise<void>;
  delete(id: string): Promise<void>;
  execute(id: string): Promise<void>;
}

export interface IScriptService extends IService {
  execute(scriptId: string, params?: any): Promise<any>;
  list(): Promise<any[]>;
  save(script: any): Promise<string>;
  delete(scriptId: string): Promise<void>;
}

export interface IEventTriggerService extends IService {
  emit(eventName: string, data?: any): Promise<void>;
  list(): Promise<string[]>;
  register(eventName: string, handler: (data: any) => void): void;
  unregister(eventName: string): void;
}

export interface IRemoteControlService extends IService {
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<any>;
}

export interface IHTTPServerService extends IService {
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  getServerUrl(): Promise<string>;
}

export interface IMIDIManager extends IService {
  listDevices(): Promise<any[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  send(deviceId: string, message: any): Promise<void>;
  onMessage(handler: (message: any) => void): void;
}

export interface ILyricsFetcher extends IService {
  fetch(title: string, artist: string): Promise<any>;
  search(query: string): Promise<any[]>;
}

export interface IFFmpegService extends IService {
  convertToOgg(inputPath: string, outputDir: string, onProgress?: (progress: number) => void): Promise<string>;
  transposeAudio(songPath: string, semitones: number): Promise<string>;
  getVideoMetadata(path: string): Promise<any>;
  transcodeVideo(inputPath: string, outputPath?: string): Promise<string>;
  generateThumbnail(videoPath: string, outputPath?: string): Promise<string>;
}

export interface ISlidesService extends IService {
  import(filePath: string): Promise<string[]>;
  export(slides: any[], outputPath: string): Promise<void>;
  getAll(): Promise<any[]>;
  create(slide: any): Promise<string>;
  update(id: string, slide: any): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IDisplayConfigService extends IService {
  getAll(): Promise<DisplayConfig[]>;
  get(id: string): Promise<DisplayConfig | null>;
  getEnabled(): Promise<DisplayConfig[]>;
  create(config: Partial<DisplayConfig>): Promise<string>;
  update(id: string, config: Partial<DisplayConfig>): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
}

export interface ITextService extends IService {
  render(text: string, options?: any): Promise<string>;
}

export interface IYouTubeService extends IService {
  download(url: string, outputPath: string): Promise<string>;
  getInfo(url: string): Promise<any>;
}

export interface IScriptingAPI {
  display: {
    show(content: any): Promise<void>;
    clear(): Promise<void>;
    black(): Promise<void>;
  };
  audio: {
    play(path: string): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
  };
  window: {
    showAudience(): Promise<void>;
    hideAudience(): Promise<void>;
    showConfidence(): Promise<void>;
    hideConfidence(): Promise<void>;
  };
  macro: {
    execute(id: string): Promise<void>;
  };
  scheduler: {
    getUpcoming(): Promise<any[]>;
  };
}

export abstract class BaseElectronService extends EventEmitter implements IService {
  protected initialized: boolean = false;
  protected config: ServiceConfig;
  protected abstract readonly serviceName: string;

  constructor(config?: ServiceConfig) {
    super();
    this.config = config || {};
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('warn', 'Service already initialized');
      return;
    }

    try {
      this.log('info', 'Initializing service...');
      await this.onInitialize();
      this.initialized = true;
      this.log('info', 'Service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize service', error);
      throw error;
    }
  }

  public dispose(): void {
    if (!this.initialized) {
      return;
    }

    try {
      this.log('info', 'Disposing service...');
      this.onDispose();
      this.initialized = false;
      this.emit('disposed');
      this.removeAllListeners();
    } catch (error) {
      this.log('error', 'Error disposing service', error);
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  protected async onInitialize(): Promise<void> {
    // Default implementation - override in subclasses
  }

  protected onDispose(): void {
    // Default implementation - override in subclasses
  }

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const prefix = `[${this.serviceName}]`;
    switch (level) {
      case 'debug':
        if (this.config.logLevel === 'debug') {
          console.debug(prefix, message, ...args);
        }
        break;
      case 'info':
        console.log(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  protected handleError(operation: string, error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.log('error', `Error in ${operation}:`, message);
    this.emit('error', { operation, error });
    throw error;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.serviceName} is not initialized. Call initialize() first.`);
    }
  }
}

export interface IServiceFactory {
  createService<T extends IService>(serviceType: string, config?: ServiceConfig): T;
  registerService(serviceType: string, factory: (config?: ServiceConfig) => IService): void;
}
