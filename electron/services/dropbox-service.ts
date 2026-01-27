/**
 * Dropbox Service
 * Handles Dropbox OAuth authentication and file operations
 */

import { Dropbox, files } from 'dropbox';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService, ICloudStorageService, ServiceConfig } from '../types/services';
import { CloudFile } from '../types/models';

// ==================== Type Definitions ====================

interface DropboxTokenData {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

interface AuthResult {
  authenticated: boolean;
  authUrl?: string;
  message?: string;
}

interface SyncedFile {
  name: string;
  path: string;
  size?: number;
  action: 'downloaded' | 'updated';
}

// ==================== Dropbox Service Class ====================

/**
 * Dropbox Service Implementation
 * Provides OAuth2 authentication and file sync capabilities for Dropbox
 */
export class DropboxService extends BaseElectronService implements ICloudStorageService {
  protected readonly serviceName = 'DropboxService';

  private readonly TOKEN_PATH: string;
  private dbx: Dropbox | null = null;

  constructor(config?: ServiceConfig) {
    super(config);
    this.TOKEN_PATH = path.join(app.getPath('userData'), 'dropbox-token.json');
  }

  /**
   * Initialize the Dropbox service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Dropbox service initialized');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.dbx = null;
    this.log('info', 'Dropbox service disposed');
  }

  /**
   * Authenticate with Dropbox
   * @returns True if authenticated, false otherwise
   */
  public async authenticate(): Promise<boolean> {
    try {
      const result = await this.performAuthentication();
      return result.authenticated;
    } catch (error) {
      this.handleError('authenticate', error);
    }
  }

  /**
   * Perform authentication logic
   * @returns Authentication result object
   */
  private async performAuthentication(): Promise<AuthResult> {
    try {
      // Check if we have a stored token
      if (await fs.pathExists(this.TOKEN_PATH)) {
        const tokenData = await fs.readJson(this.TOKEN_PATH) as DropboxTokenData;
        this.dbx = new Dropbox({ accessToken: tokenData.accessToken });

        // Verify token is valid
        try {
          await this.dbx.usersGetCurrentAccount();
          this.log('info', 'Authenticated with stored token');
          return { authenticated: true };
        } catch (err) {
          // Token might be expired, need to re-authenticate
          this.log('warn', 'Stored token is invalid, re-authentication required');
          this.dbx = null;
          await fs.remove(this.TOKEN_PATH);
        }
      }

      // Need to authenticate - return auth URL
      const clientId = process.env.DROPBOX_CLIENT_ID || '';
      if (!clientId) {
        throw new Error(
          'Dropbox client ID not configured. Please set DROPBOX_CLIENT_ID environment variable.'
        );
      }

      const redirectUri = 'http://localhost:3000/dropbox-callback';
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;

      this.log('info', 'Authentication URL generated');
      return {
        authenticated: false,
        authUrl: authUrl,
        message: 'Please authorize the application by visiting the URL',
      };
    } catch (error) {
      this.log('error', 'Dropbox authentication error:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Complete authentication with access token
   * @param accessToken - Access token from OAuth flow
   * @returns Authentication result
   */
  public async completeAuth(accessToken: string): Promise<AuthResult> {
    try {
      this.dbx = new Dropbox({ accessToken });

      // Verify token works
      await this.dbx.usersGetCurrentAccount();

      // Save token for future use
      await fs.writeJson(this.TOKEN_PATH, { accessToken });

      this.log('info', 'Authentication completed successfully');
      return { authenticated: true };
    } catch (error) {
      this.log('error', 'Failed to complete authentication:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List files in a Dropbox folder
   * @param folderPath - Dropbox folder path (empty string for root)
   * @returns Array of cloud files
   */
  public async listFiles(folderPath: string = ''): Promise<CloudFile[]> {
    try {
      await this.ensureAuthenticated();

      if (!this.dbx) {
        throw new Error('Dropbox client not initialized');
      }

      const response = await this.dbx.filesListFolder({
        path: folderPath || '',
        recursive: false,
      });

      const files = response.result.entries;
      this.log('debug', `Listed ${files.length} files from folder ${folderPath || 'root'}`);

      return this.mapDropboxEntries(files);
    } catch (error) {
      this.handleError('listFiles', error);
    }
  }

  /**
   * Download a file from Dropbox
   * @param dropboxPath - Path to file in Dropbox
   * @param outputPath - Local destination path
   */
  public async downloadFile(dropboxPath: string, outputPath: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      if (!this.dbx) {
        throw new Error('Dropbox client not initialized');
      }

      const destPath = path.resolve(outputPath);
      await fs.ensureDir(path.dirname(destPath));

      const response = await this.dbx.filesDownload({ path: dropboxPath });
      
      // The response contains a fileBinary property with the file content
      const fileData = (response.result as any).fileBinary;
      if (!fileData) {
        throw new Error('No file data received from Dropbox');
      }

      await fs.writeFile(destPath, fileData);

      this.log('debug', `Downloaded file to ${destPath}`);
    } catch (error) {
      this.handleError(`downloadFile(${dropboxPath})`, error);
    }
  }

  /**
   * Sync a folder from Dropbox to local path
   * @param dropboxPath - Path to folder in Dropbox
   * @param localPath - Local destination path
   */
  public async syncFolder(dropboxPath: string, localPath: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      if (!this.dbx) {
        throw new Error('Dropbox client not initialized');
      }

      await fs.ensureDir(localPath);

      // Get all files in the folder
      const entries = await this.listFiles(dropboxPath);
      const syncedFiles: SyncedFile[] = [];

      for (const entry of entries) {
        if (entry.isFolder) {
          // Recursively sync subfolders
          const subfolderPath = path.join(localPath, entry.name);
          await this.syncFolder(entry.path, subfolderPath);
        } else {
          // Download file if it doesn't exist or is newer on Dropbox
          const localFilePath = path.join(localPath, entry.name);
          const shouldDownload = !(await fs.pathExists(localFilePath));

          // Check if file needs updating based on modification time
          let needsUpdate = false;
          if (!shouldDownload && entry.modifiedTime) {
            try {
              const localStats = await fs.stat(localFilePath);
              const localModified = localStats.mtime;
              const dropboxModified = new Date(entry.modifiedTime);
              needsUpdate = dropboxModified > localModified;
            } catch (err) {
              // If we can't stat the file, download it
              needsUpdate = true;
            }
          }

          if (shouldDownload || needsUpdate) {
            await this.downloadFile(entry.path, localFilePath);
            syncedFiles.push({
              name: entry.name,
              path: localFilePath,
              size: entry.size,
              action: shouldDownload ? 'downloaded' : 'updated',
            });
          }
        }
      }

      this.log('info', `Synced folder ${dropboxPath}: ${syncedFiles.length} files processed`);
    } catch (error) {
      this.handleError(`syncFolder(${dropboxPath})`, error);
    }
  }

  /**
   * Map Dropbox entries to CloudFile format
   * @param entries - Dropbox file/folder entries
   * @returns Array of cloud files
   */
  private mapDropboxEntries(entries: files.MetadataReference[]): CloudFile[] {
    return entries.map((entry) => {
      const isFolder = entry['.tag'] === 'folder';
      const fileEntry = entry as files.FileMetadataReference;

      return {
        id: (entry as any).id || entry.name, // Dropbox may not always have id field
        name: entry.name,
        path: entry.path_display || '',
        isFolder: isFolder,
        size: isFolder ? 0 : (fileEntry.size || 0),
        modifiedTime: isFolder ? new Date().toISOString() : (fileEntry.server_modified || new Date().toISOString()),
      };
    });
  }

  /**
   * Ensure the service is authenticated
   * @throws Error if not authenticated
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.dbx) {
      const result = await this.performAuthentication();
      if (!result.authenticated) {
        throw new Error('Not authenticated. Please complete authentication flow.');
      }
    }
  }
}

// ==================== Singleton Export ====================

let dropboxInstance: DropboxService | null = null;

/**
 * Get or create the Dropbox service singleton
 */
export function getDropboxService(config?: ServiceConfig): DropboxService {
  if (!dropboxInstance) {
    dropboxInstance = new DropboxService(config);
  }
  return dropboxInstance;
}

// Export for backward compatibility
export default DropboxService;
