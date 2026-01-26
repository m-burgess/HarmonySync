/**
 * File Service - Business logic for file system operations
 * 
 * This service abstracts file system operations including:
 * - Folder and file selection dialogs
 * - Reading and writing files
 * - File existence checks
 * - Path operations
 * 
 * OOP Principles:
 * - Encapsulation: Private IPC service
 * - Single Responsibility: Only handles file operations
 * - Dependency Injection: Depends on IpcService abstraction
 * - Interface Segregation: Implements IFileService
 */

import { BaseService } from '../base/BaseService';
import type { IFileService, IIpcService } from '../types/services';
import type { FileSelectionResult, FolderSelectionResult, SetlistFolder } from '../types';

/**
 * File Service Implementation
 */
export class FileService extends BaseService implements IFileService {
  protected readonly serviceName = 'FileService';
  
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
   * Open folder selection dialog
   * @param title - Dialog title
   * @returns Selected folder result
   */
  public async selectFolder(title: string = 'Select Folder'): Promise<FolderSelectionResult> {
    try {
      const result = await this.ipc.invoke('dialog:openDirectory', { title }) as FolderSelectionResult;
      return result || { canceled: true, filePaths: [] };
    } catch (error) {
      return this.handleError('selectFolder', error);
    }
  }

  /**
   * Open file selection dialog
   * @param title - Dialog title
   * @param filters - File type filters
   * @returns Selected file result
   */
  public async selectFile(
    title: string = 'Select File',
    filters: Array<{ name: string; extensions: string[] }> = []
  ): Promise<FileSelectionResult> {
    try {
      const result = await this.ipc.invoke('dialog:openFile', { title, filters }) as FileSelectionResult;
      return result || { canceled: true, filePaths: [] };
    } catch (error) {
      return this.handleError('selectFile', error);
    }
  }

  /**
   * Read text file contents
   * @param filePath - File path
   * @returns File contents as text
   */
  public async readTextFile(filePath: string): Promise<string> {
    try {
      return await this.ipc.invoke('fs:readFile', filePath, 'utf8') as string;
    } catch (error) {
      return this.handleError('readTextFile', error);
    }
  }

  /**
   * Write text file contents
   * @param filePath - File path
   * @param content - Text contents
   */
  public async writeTextFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ipc.invoke('fs:writeFile', filePath, content, 'utf8');
    } catch (error) {
      return this.handleError('writeTextFile', error);
    }
  }

  /**
   * Check if file or folder exists
   * @param filePath - File or folder path
   * @returns True if exists
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      return await this.ipc.invoke('fs:exists', filePath) as boolean;
    } catch (error) {
      this.logError('exists check failed', error);
      return false;
    }
  }

  /**
   * Get song folders from a base path
   * @param basePath - Base directory path
   * @returns Array of setlist folders
   */
  public async getSongFolders(basePath: string): Promise<SetlistFolder[]> {
    try {
      return await this.ipc.invoke('setlist:getSongFolders', basePath) as SetlistFolder[];
    } catch (error) {
      return this.handleError('getSongFolders', error);
    }
  }

  /**
   * Get audio files from a folder
   * @param folderPath - Folder path
   * @returns Array of audio file paths
   */
  public async getAudioFiles(folderPath: string): Promise<string[]> {
    try {
      return await this.ipc.invoke('fs:getAudioFiles', folderPath) as string[];
    } catch (error) {
      this.logError('getAudioFiles failed', error);
      return [];
    }
  }

  /**
   * Get slide files from a folder
   * @param folderPath - Folder path
   * @returns Array of slide file paths
   */
  public async getSlideFiles(folderPath: string): Promise<string[]> {
    try {
      return await this.ipc.invoke('fs:getSlideFiles', folderPath) as string[];
    } catch (error) {
      this.logError('getSlideFiles failed', error);
      return [];
    }
  }
}

export default FileService;
