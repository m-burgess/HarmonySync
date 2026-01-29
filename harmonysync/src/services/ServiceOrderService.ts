/**
 * Service Order Service - Business logic for service order management
 * 
 * This service abstracts all service order-related functionality including:
 * - Loading and managing service orders
 * - Adding/removing folders
 * - Managing song details
 * - Searching songs
 * 
 * OOP Principles:
 * - Encapsulation: Private services
 * - Single Responsibility: Only handles service order operations
 * - Dependency Injection: Depends on IpcService and FileService abstractions
 * - Interface Segregation: Implements IServiceOrderService
 */

import { BaseService } from '../base/BaseService';
import type { IServiceOrderService, IIpcService, IFileService } from '../types/services';
import type { ServiceOrderFolder, Song } from '../types';

/**
 * Service Order Service Implementation
 */
export class ServiceOrderService extends BaseService implements IServiceOrderService {
  protected readonly serviceName = 'ServiceOrderService';
  
  private readonly ipc: IIpcService;
  private readonly fileService: IFileService;

  /**
   * Constructor
   * @param ipcService - IPC service for communication
   * @param fileService - File service for file operations
   */
  constructor(ipcService: IIpcService, fileService: IFileService) {
    super();
    this.ipc = ipcService;
    this.fileService = fileService;
  }

  /**
   * Load service order from a base path
   * @param basePath - Base directory path
   * @returns Array of service order folders
   */
  public async loadServiceOrder(basePath: string): Promise<ServiceOrderFolder[]> {
    try {
      return await this.fileService.getSongFolders(basePath);
    } catch (error) {
      return this.handleError('loadServiceOrder', error);
    }
  }

  /**
   * Add a folder to the service order
   * @param folderPath - Folder path to add
   * @returns Added service order folder
   */
  public async addFolder(folderPath: string): Promise<ServiceOrderFolder> {
    try {
      return await this.ipc.invoke('service-order:addFolder', folderPath) as ServiceOrderFolder;
    } catch (error) {
      return this.handleError('addFolder', error);
    }
  }

  /**
   * Remove a folder from the service order
   * @param folderPath - Folder path to remove
   */
  public async removeFolder(folderPath: string): Promise<void> {
    try {
      await this.ipc.invoke('service-order:removeFolder', folderPath);
    } catch (error) {
      return this.handleError('removeFolder', error);
    }
  }

  /**
   * Get song details
   * @param songPath - Path to song folder
   * @returns Song details
   */
  public async getSongDetails(songPath: string): Promise<Song> {
    try {
      return await this.ipc.invoke('service-order:getSongDetails', songPath) as Song;
    } catch (error) {
      return this.handleError('getSongDetails', error);
    }
  }

  /**
   * Save song details
   * @param song - Song to save
   */
  public async saveSong(song: Song): Promise<void> {
    try {
      await this.ipc.invoke('service-order:saveSong', song);
    } catch (error) {
      return this.handleError('saveSong', error);
    }
  }

  /**
   * Search songs by query
   * @param query - Search query
   * @returns Array of matching songs
   */
  public async searchSongs(query: string): Promise<Song[]> {
    try {
      return await this.ipc.invoke('service-order:searchSongs', query) as Song[];
    } catch (error) {
      this.logError('searchSongs failed', error);
      return [];
    }
  }

  /**
   * Select folders using file dialog
   * @returns Array of selected folder paths
   */
  public async selectFolders(): Promise<string[] | null> {
    try {
      return await this.fileService.selectFolders();
    } catch (error) {
      return this.handleError('selectFolders', error);
    }
  }

  /**
   * Check if a path already exists in the service order
   * @param serviceOrder - Array of service order items
   * @param path - Path to check
   * @returns True if path exists in service order
   */
  public pathExistsInServiceOrder(serviceOrder: ServiceOrderFolder[], path: string): boolean {
    return serviceOrder.some(item => item.path === path);
  }

  /**
   * Load song metadata from a folder
   * @param folderPath - Path to song folder
   * @returns Service order item with metadata
   */
  public async loadSongMetadata(folderPath: string): Promise<ServiceOrderFolder> {
    try {
      return await this.ipc.invoke('service-order:loadSongMetadata', folderPath) as ServiceOrderFolder;
    } catch (error) {
      return this.handleError('loadSongMetadata', error);
    }
  }

  /**
   * Load lyrics for a song
   * @param songPath - Path to song folder
   * @returns Lyrics content
   */
  public async loadLyrics(songPath: string): Promise<string | null> {
    try {
      return await this.ipc.invoke('service-order:loadLyrics', songPath) as string | null;
    } catch (error) {
      this.logError('loadLyrics failed', error);
      return null;
    }
  }

  /**
   * Open lyrics file for editing
   * @param songPath - Path to song folder
   */
  public async openLyricsFile(songPath: string): Promise<void> {
    try {
      await this.ipc.invoke('service-order:openLyricsFile', songPath);
    } catch (error) {
      return this.handleError('openLyricsFile', error);
    }
  }
}

export default ServiceOrderService;
