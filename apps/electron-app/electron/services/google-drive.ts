/**
 * Google Drive Service
 * Handles Google Drive OAuth authentication and file operations
 */

import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService, ICloudStorageService, ServiceConfig } from '../types/services';
import { CloudFile } from '../types/models';
import { Readable } from 'stream';

// ==================== Type Definitions ====================

interface GoogleCredentials {
  installed?: GoogleOAuthConfig;
  web?: GoogleOAuthConfig;
}

interface GoogleOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
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

// ==================== Google Drive Service Class ====================

/**
 * Google Drive Service Implementation
 * Provides OAuth2 authentication and file sync capabilities for Google Drive
 */
export class GoogleDriveService extends BaseElectronService implements ICloudStorageService {
  protected readonly serviceName = 'GoogleDriveService';
  
  private readonly SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
  private readonly TOKEN_PATH: string;
  private readonly CREDENTIALS_PATH: string;
  
  private oauth2Client: any = null;
  private drive: drive_v3.Drive | null = null;

  constructor(config?: ServiceConfig) {
    super(config);
    this.TOKEN_PATH = path.join(app.getPath('userData'), 'gdrive-token.json');
    this.CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gdrive-credentials.json');
  }

  /**
   * Initialize the Google Drive service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Google Drive service initialized');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.oauth2Client = null;
    this.drive = null;
    this.log('info', 'Google Drive service disposed');
  }

  /**
   * Authenticate with Google Drive
   * @returns Authentication result with status and optional auth URL
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
      // Check if credentials exist
      if (!(await fs.pathExists(this.CREDENTIALS_PATH))) {
        throw new Error('Google Drive credentials not found. Please add credentials file.');
      }

      const credentials = await fs.readJson(this.CREDENTIALS_PATH) as GoogleCredentials;
      const oauthConfig = credentials.installed || credentials.web;
      
      if (!oauthConfig) {
        throw new Error('Invalid credentials format');
      }

      const { client_secret, client_id, redirect_uris } = oauthConfig;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Check if we have a stored token
      if (await fs.pathExists(this.TOKEN_PATH)) {
        const token = await fs.readJson(this.TOKEN_PATH) as GoogleTokens;
        this.oauth2Client.setCredentials(token);
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.log('info', 'Authenticated with stored token');
        return { authenticated: true };
      }

      // Generate auth URL for user to authorize
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.SCOPES,
      });

      this.log('info', 'Authentication URL generated');
      return {
        authenticated: false,
        authUrl: authUrl,
        message: 'Please authorize the application by visiting the URL',
      };
    } catch (error) {
      this.log('error', 'Google Drive authentication error:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Complete authentication with authorization code
   * @param code - Authorization code from OAuth flow
   * @returns Authentication result
   */
  public async completeAuth(code: string): Promise<AuthResult> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized. Call authenticate() first.');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Save token for future use
      await fs.writeJson(this.TOKEN_PATH, tokens);

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.log('info', 'Authentication completed successfully');
      
      return { authenticated: true };
    } catch (error) {
      this.log('error', 'Failed to complete authentication:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List files in a Google Drive folder
   * @param folderId - Google Drive folder ID
   * @returns Array of cloud files
   */
  public async listFiles(folderId?: string): Promise<CloudFile[]> {
    try {
      await this.ensureAuthenticated();

      if (!this.drive) {
        throw new Error('Drive not initialized');
      }

      const query = folderId 
        ? `'${folderId}' in parents and trashed = false`
        : 'trashed = false';

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        orderBy: 'name',
      });

      const files = response.data.files || [];
      this.log('debug', `Listed ${files.length} files from folder ${folderId || 'root'}`);

      return files.map(file => ({
        id: file.id || '',
        name: file.name || '',
        path: file.name || '',
        size: parseInt(file.size || '0', 10),
        mimeType: file.mimeType || undefined,
        modifiedTime: file.modifiedTime || new Date().toISOString(),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));
    } catch (error) {
      this.handleError('listFiles', error);
    }
  }

  /**
   * Download a file from Google Drive
   * @param fileId - Google Drive file ID
   * @param outputPath - Local destination path
   */
  public async downloadFile(fileId: string, outputPath: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      if (!this.drive) {
        throw new Error('Drive not initialized');
      }

      const destPath = path.resolve(outputPath);
      await fs.ensureDir(path.dirname(destPath));

      const dest = fs.createWriteStream(destPath);

      const response = await this.drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      await new Promise<void>((resolve, reject) => {
        const stream = response.data as Readable;
        stream
          .on('end', () => {
            this.log('debug', `Downloaded file to ${destPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.log('error', 'Error downloading file:', err);
            reject(err);
          })
          .pipe(dest);
      });
    } catch (error) {
      this.handleError(`downloadFile(${fileId})`, error);
    }
  }

  /**
   * Sync an entire folder from Google Drive to local path
   * @param folderId - Google Drive folder ID
   * @param localPath - Local destination path
   */
  public async syncFolder(folderId: string, localPath: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      if (!this.drive) {
        throw new Error('Drive not initialized');
      }

      await fs.ensureDir(localPath);

      // Get all files in the folder
      const files = await this.listFiles(folderId);
      const syncedFiles: SyncedFile[] = [];

      for (const file of files) {
        if (file.isFolder) {
          // Recursively sync subfolders
          const subfolderPath = path.join(localPath, file.name);
          await this.syncFolder(file.id, subfolderPath);
        } else {
          // Download file if it doesn't exist or is newer on Drive
          const localFilePath = path.join(localPath, file.name);
          const shouldDownload = !(await fs.pathExists(localFilePath));

          // Check if file needs updating based on modification time
          let needsUpdate = false;
          if (!shouldDownload && file.modifiedTime) {
            try {
              const localStats = await fs.stat(localFilePath);
              const localModified = localStats.mtime;
              const driveModified = new Date(file.modifiedTime);
              needsUpdate = driveModified > localModified;
            } catch (err) {
              // If we can't stat the file, download it
              needsUpdate = true;
            }
          }

          if (shouldDownload || needsUpdate) {
            await this.downloadFile(file.id, localFilePath);
            syncedFiles.push({
              name: file.name,
              path: localFilePath,
              size: file.size,
              action: shouldDownload ? 'downloaded' : 'updated',
            });
          }
        }
      }

      this.log('info', `Synced folder ${folderId}: ${syncedFiles.length} files processed`);
    } catch (error) {
      this.handleError(`syncFolder(${folderId})`, error);
    }
  }

  /**
   * Ensure the service is authenticated
   * @throws Error if not authenticated
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.drive) {
      const result = await this.performAuthentication();
      if (!result.authenticated) {
        throw new Error('Not authenticated. Please complete authentication flow.');
      }
    }
  }
}

// ==================== Singleton Export ====================

let googleDriveInstance: GoogleDriveService | null = null;

/**
 * Get or create the Google Drive service singleton
 */
export function getGoogleDriveService(config?: ServiceConfig): GoogleDriveService {
  if (!googleDriveInstance) {
    googleDriveInstance = new GoogleDriveService(config);
  }
  return googleDriveInstance;
}

// Export for backward compatibility
export default GoogleDriveService;
