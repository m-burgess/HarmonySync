/**
 * Testing Abstractions and Interfaces
 *
 * This file provides abstractions for external dependencies to enable effective unit testing.
 * These interfaces allow services to be tested without requiring actual Electron runtime,
 * FFmpeg installation, or file system operations.
 */

import { EventEmitter } from 'events';

// ==================== File System Abstraction ====================

/**
 * Interface for file system operations
 * Allows mocking of fs-extra operations in tests
 */
export interface IFileSystem {
  readFile(path: string, encoding?: BufferEncoding): Promise<Buffer | string>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  readdir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean; size: number }>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  ensureDir(path: string): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  remove(path: string): Promise<void>;
  pathExists(path: string): Promise<boolean>;
}

// ==================== Electron App Abstraction ====================

/**
 * Interface for Electron app operations
 * Abstracts Electron's app module for testing
 */
export interface IElectronApp {
  getPath(name: 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs' | 'crashDumps'): string;
  getVersion(): string;
  getName(): string;
  isPackaged(): boolean;
}

// ==================== Process Execution Abstraction ====================

/**
 * Interface for process execution
 * Abstracts child_process operations for testing
 */
export interface IProcessExecutor {
  spawn(command: string, args?: string[], options?: any): any;
  exec(command: string, options?: any): Promise<{ stdout: string; stderr: string }>;
  spawnSync(command: string, args?: string[], options?: any): any;
}

// ==================== FFmpeg Abstraction ====================

/**
 * Interface for FFmpeg operations
 * Abstracts fluent-ffmpeg for testing
 */
export interface IFFmpegCommand {
  audioCodec(codec: string): this;
  audioBitrate(bitrate: string): this;
  audioQuality(quality: number): this;
  audioFilters(filters: string | string[]): this;
  on(event: 'progress' | 'end' | 'error', handler: (...args: any[]) => void): this;
  save(output: string): this;
}

/**
 * Factory interface for creating FFmpeg commands
 */
export interface IFFmpegFactory {
  createCommand(input: string): IFFmpegCommand;
  ffprobe(path: string): Promise<any>;
}

// ==================== Window Manager Abstraction ====================

/**
 * Interface for browser window operations
 * Abstracts Electron's BrowserWindow for testing
 */
export interface IWindowManager {
  createWindow(options: any): IBrowserWindow;
  getWindow(id: number): IBrowserWindow | null;
  getAllWindows(): IBrowserWindow[];
  getFocusedWindow(): IBrowserWindow | null;
}

/**
 * Interface for a browser window
 * Abstracts Electron's BrowserWindow instance
 */
export interface IBrowserWindow {
  id: number;
  webContents: IWebContents;
  loadURL(url: string): Promise<void>;
  loadFile(filePath: string): Promise<void>;
  show(): void;
  hide(): void;
  close(): void;
  isVisible(): boolean;
  isFullScreen(): boolean;
  setFullScreen(flag: boolean): void;
  getBounds(): { x: number; y: number; width: number; height: number };
  setBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): void;
  on(event: string, listener: (...args: any[]) => void): void;
  once(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

/**
 * Interface for web contents
 */
export interface IWebContents {
  send(channel: string, ...args: any[]): void;
  executeJavaScript(code: string): Promise<any>;
  insertCSS(css: string): Promise<string>;
  openDevTools(options?: any): void;
  closeDevTools(): void;
}

// ==================== Event Bus Abstraction ====================

/**
 * Interface for event bus operations
 * Provides a testable abstraction for event-driven communication
 */
export interface IEventBus extends EventEmitter {
  publish(event: string, data?: any): void;
  subscribe(event: string, handler: (data: any) => void): void;
  unsubscribe(event: string, handler: (data: any) => void): void;
  clear(): void;
}

// ==================== HTTP Client Abstraction ====================

/**
 * Interface for HTTP client operations
 * Abstracts axios or other HTTP libraries for testing
 */
export interface IHttpClient {
  get<T = any>(url: string, config?: any): Promise<IHttpResponse<T>>;
  post<T = any>(url: string, data?: any, config?: any): Promise<IHttpResponse<T>>;
  put<T = any>(url: string, data?: any, config?: any): Promise<IHttpResponse<T>>;
  delete<T = any>(url: string, config?: any): Promise<IHttpResponse<T>>;
}

/**
 * HTTP response interface
 */
export interface IHttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

// ==================== Logger Abstraction ====================

/**
 * Interface for logging operations
 * Allows different logging implementations (console, file, remote, etc.)
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// ==================== Path Utilities Abstraction ====================

/**
 * Interface for path operations
 * Abstracts path module for testing (though path is already pure)
 */
export interface IPathUtil {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  basename(path: string, ext?: string): string;
  dirname(path: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
  normalize(path: string): string;
}

// ==================== Cloud Storage Abstraction ====================

/**
 * Generic interface for cloud storage providers
 * Can be implemented for Google Drive, Dropbox, etc.
 */
export interface ICloudProvider {
  authenticate(credentials: any): Promise<boolean>;
  listFiles(folderId?: string): Promise<ICloudFile[]>;
  downloadFile(fileId: string, outputPath: string): Promise<void>;
  uploadFile(filePath: string, folderId?: string): Promise<string>;
  createFolder(name: string, parentId?: string): Promise<string>;
  deleteFile(fileId: string): Promise<void>;
}

/**
 * Cloud file metadata
 */
export interface ICloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: Date;
  isFolder: boolean;
  parentId?: string;
}

// ==================== Database Abstraction ====================

/**
 * Interface for database operations
 * Abstracts storage mechanism (JSON, SQLite, etc.)
 */
export interface IDatabase {
  get<T>(collection: string, id: string): Promise<T | null>;
  getAll<T>(collection: string): Promise<T[]>;
  query<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]>;
  create<T>(collection: string, data: T): Promise<string>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
}

// ==================== Service Dependencies ====================

/**
 * Dependency injection container interface
 */
export interface IDependencyContainer {
  register<T>(name: string, instance: T): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
}

/**
 * Service context with all dependencies
 * Pass this to services instead of individual dependencies
 */
export interface IServiceContext {
  fileSystem?: IFileSystem;
  electronApp?: IElectronApp;
  processExecutor?: IProcessExecutor;
  ffmpegFactory?: IFFmpegFactory;
  windowManager?: IWindowManager;
  eventBus?: IEventBus;
  httpClient?: IHttpClient;
  logger?: ILogger;
  pathUtil?: IPathUtil;
  database?: IDatabase;
  [key: string]: any; // Allow custom dependencies
}

// ==================== Mock Implementations for Testing ====================

/**
 * Mock file system implementation for tests
 */
export class MockFileSystem implements IFileSystem {
  private files: Map<string, Buffer | string> = new Map();
  private directories: Set<string> = new Set();

  async readFile(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    if (encoding && Buffer.isBuffer(content)) {
      return content.toString(encoding);
    }
    return content;
  }

  async writeFile(path: string, data: string | Buffer): Promise<void> {
    this.files.set(path, data);
  }

  async readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    const results: string[] = [];
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(path + '/')) {
        const relativePath = filePath.substring(path.length + 1);
        if (!relativePath.includes('/')) {
          results.push(relativePath);
        }
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(path + '/')) {
        const relativePath = dirPath.substring(path.length + 1);
        if (!relativePath.includes('/')) {
          results.push(relativePath);
        }
      }
    }
    return results;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean; size: number }> {
    const isDir = this.directories.has(path);
    const isFile = this.files.has(path);
    if (!isDir && !isFile) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    const content = this.files.get(path);
    const size = content ? (Buffer.isBuffer(content) ? content.length : Buffer.from(content).length) : 0;
    return {
      isDirectory: () => isDir,
      isFile: () => isFile,
      size
    };
  }

  async mkdir(path: string, _options?: { recursive?: boolean }): Promise<void> {
    this.directories.add(path);
  }

  async ensureDir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async copy(src: string, dest: string): Promise<void> {
    const content = this.files.get(src);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${src}'`);
    }
    this.files.set(dest, content);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
    this.directories.delete(path);
  }

  async pathExists(path: string): Promise<boolean> {
    return this.exists(path);
  }

  // Test helpers
  addFile(path: string, content: string | Buffer): void {
    this.files.set(path, content);
  }

  addDirectory(path: string): void {
    this.directories.add(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}

/**
 * Mock Electron app implementation for tests
 */
export class MockElectronApp implements IElectronApp {
  private paths: Map<string, string> = new Map([
    ['home', '/mock/home'],
    ['appData', '/mock/appData'],
    ['userData', '/mock/userData'],
    ['temp', '/mock/temp'],
    ['exe', '/mock/exe'],
    ['module', '/mock/module'],
    ['desktop', '/mock/desktop'],
    ['documents', '/mock/documents'],
    ['downloads', '/mock/downloads'],
    ['music', '/mock/music'],
    ['pictures', '/mock/pictures'],
    ['videos', '/mock/videos'],
    ['logs', '/mock/logs'],
    ['crashDumps', '/mock/crashDumps']
  ]);

  getPath(name: 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs' | 'crashDumps'): string {
    return this.paths.get(name) || '/mock/unknown';
  }

  getVersion(): string {
    return '1.0.0-test';
  }

  getName(): string {
    return 'MockApp';
  }

  isPackaged(): boolean {
    return false;
  }

  // Test helper
  setPath(name: string, path: string): void {
    this.paths.set(name, path);
  }
}

/**
 * Mock logger implementation for tests
 */
export class MockLogger implements ILogger {
  public logs: Array<{ level: string; message: string; args: any[] }> = [];

  debug(message: string, ...args: any[]): void {
    this.logs.push({ level: 'debug', message, args });
  }

  info(message: string, ...args: any[]): void {
    this.logs.push({ level: 'info', message, args });
  }

  warn(message: string, ...args: any[]): void {
    this.logs.push({ level: 'warn', message, args });
  }

  error(message: string, ...args: any[]): void {
    this.logs.push({ level: 'error', message, args });
  }

  // Test helpers
  clear(): void {
    this.logs = [];
  }

  hasLog(level: string, message: string): boolean {
    return this.logs.some(log => log.level === level && log.message.includes(message));
  }
}

/**
 * Mock event bus implementation for tests
 */
export class MockEventBus extends EventEmitter implements IEventBus {
  publish(event: string, data?: any): void {
    this.emit(event, data);
  }

  subscribe(event: string, handler: (data: any) => void): void {
    this.on(event, handler);
  }

  unsubscribe(event: string, handler: (data: any) => void): void {
    this.removeListener(event, handler);
  }

  clear(): void {
    this.removeAllListeners();
  }
}

/**
 * Mock HTTP client implementation for tests
 */
export class MockHttpClient implements IHttpClient {
  private responses: Map<string, IHttpResponse> = new Map();

  async get<T = any>(url: string, _config?: any): Promise<IHttpResponse<T>> {
    return this.getResponse(url) as IHttpResponse<T>;
  }

  async post<T = any>(url: string, _data?: any, _config?: any): Promise<IHttpResponse<T>> {
    return this.getResponse(url) as IHttpResponse<T>;
  }

  async put<T = any>(url: string, _data?: any, _config?: any): Promise<IHttpResponse<T>> {
    return this.getResponse(url) as IHttpResponse<T>;
  }

  async delete<T = any>(url: string, _config?: any): Promise<IHttpResponse<T>> {
    return this.getResponse(url) as IHttpResponse<T>;
  }

  private getResponse(url: string): IHttpResponse {
    const response = this.responses.get(url);
    if (!response) {
      throw new Error(`No mock response configured for: ${url}`);
    }
    return response;
  }

  // Test helpers
  mockResponse(url: string, response: IHttpResponse): void {
    this.responses.set(url, response);
  }

  clear(): void {
    this.responses.clear();
  }
}

/**
 * Mock database implementation for tests
 */
export class MockDatabase implements IDatabase {
  private collections: Map<string, Map<string, any>> = new Map();

  async get<T>(collection: string, id: string): Promise<T | null> {
    const coll = this.collections.get(collection);
    return coll?.get(id) || null;
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const coll = this.collections.get(collection);
    return coll ? Array.from(coll.values()) : [];
  }

  async query<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return all.filter(predicate);
  }

  async create<T>(collection: string, data: T): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    if (!this.collections.has(collection)) {
      this.collections.set(collection, new Map());
    }
    const coll = this.collections.get(collection)!;
    coll.set(id, { ...data, id });
    return id;
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<void> {
    const coll = this.collections.get(collection);
    if (!coll?.has(id)) {
      throw new Error(`Item ${id} not found in collection ${collection}`);
    }
    const existing = coll.get(id);
    coll.set(id, { ...existing, ...data });
  }

  async delete(collection: string, id: string): Promise<void> {
    const coll = this.collections.get(collection);
    if (coll) {
      coll.delete(id);
    }
  }

  // Test helpers
  clear(): void {
    this.collections.clear();
  }
}
