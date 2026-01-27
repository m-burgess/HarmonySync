/**
 * Setlist Service - Business logic for setlist management
 * 
 * This service abstracts all setlist-related functionality including:
 * - Loading and managing setlists
 * - Adding/removing folders
 * - Managing song details
 * - Searching songs
 * 
 * OOP Principles:
 * - Encapsulation: Private services
 * - Single Responsibility: Only handles setlist operations
 * - Dependency Injection: Depends on IpcService and FileService abstractions
 * - Interface Segregation: Implements ISetlistService
 */

import { BaseService } from '../base/BaseService';
import type { ISetlistService, IIpcService, IFileService } from '../types/services';
import type { SetlistFolder, Song } from '../types';

/**
 * Setlist Service Implementation
 */
export class SetlistService extends BaseService implements ISetlistService {
  protected readonly serviceName = 'SetlistService';
  
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
   * Load setlist from a base path
   * @param basePath - Base directory path
   * @returns Array of setlist folders
   */
  public async loadSetlist(basePath: string): Promise<SetlistFolder[]> {
    try {
      return await this.fileService.getSongFolders(basePath);
    } catch (error) {
      return this.handleError('loadSetlist', error);
    }
  }

  /**
   * Add a folder to the setlist
   * @param folderPath - Folder path to add
   * @returns Added setlist folder
   */
  public async addFolder(folderPath: string): Promise<SetlistFolder> {
    try {
      return await this.ipc.invoke('setlist:addFolder', folderPath) as SetlistFolder;
    } catch (error) {
      return this.handleError('addFolder', error);
    }
  }

  /**
   * Remove a folder from the setlist
   * @param folderPath - Folder path to remove
   */
  public async removeFolder(folderPath: string): Promise<void> {
    try {
      await this.ipc.invoke('setlist:removeFolder', folderPath);
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
      return await this.ipc.invoke('setlist:getSongDetails', songPath) as Song;
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
      await this.ipc.invoke('setlist:saveSong', song);
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
      return await this.ipc.invoke('setlist:searchSongs', query) as Song[];
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
   * Check if a path already exists in the setlist
   * @param setlist - Array of setlist items
   * @param path - Path to check
   * @returns True if path exists in setlist
   */
  public pathExistsInSetlist(setlist: SetlistFolder[], path: string): boolean {
    return setlist.some(item => item.path === path);
  }

  /**
   * Load song metadata from a folder
   * @param folderPath - Path to song folder
   * @returns Setlist item with metadata
   */
  public async loadSongMetadata(folderPath: string): Promise<SetlistFolder> {
    try {
      return await this.ipc.invoke('setlist:loadSongMetadata', folderPath) as SetlistFolder;
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
      return await this.ipc.invoke('setlist:loadLyrics', songPath) as string | null;
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
      await this.ipc.invoke('setlist:openLyricsFile', songPath);
    } catch (error) {
      return this.handleError('openLyricsFile', error);
    }
  }
}

export default SetlistService;
