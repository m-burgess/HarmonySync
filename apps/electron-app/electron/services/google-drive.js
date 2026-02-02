"use strict";
/**
 * Google Drive Service
 * Handles Google Drive OAuth authentication and file operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
exports.getGoogleDriveService = getGoogleDriveService;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
// ==================== Google Drive Service Class ====================
/**
 * Google Drive Service Implementation
 * Provides OAuth2 authentication and file sync capabilities for Google Drive
 */
class GoogleDriveService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'GoogleDriveService';
        this.SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
        this.oauth2Client = null;
        this.drive = null;
        this.TOKEN_PATH = path.join(electron_1.app.getPath('userData'), 'gdrive-token.json');
        this.CREDENTIALS_PATH = path.join(electron_1.app.getPath('userData'), 'gdrive-credentials.json');
    }
    /**
     * Initialize the Google Drive service
     */
    async onInitialize() {
        this.log('info', 'Google Drive service initialized');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.oauth2Client = null;
        this.drive = null;
        this.log('info', 'Google Drive service disposed');
    }
    /**
     * Authenticate with Google Drive
     * @returns Authentication result with status and optional auth URL
     */
    async authenticate() {
        try {
            const result = await this.performAuthentication();
            return result.authenticated;
        }
        catch (error) {
            this.handleError('authenticate', error);
        }
    }
    /**
     * Perform authentication logic
     * @returns Authentication result object
     */
    async performAuthentication() {
        try {
            // Check if credentials exist
            if (!(await fs.pathExists(this.CREDENTIALS_PATH))) {
                throw new Error('Google Drive credentials not found. Please add credentials file.');
            }
            const credentials = await fs.readJson(this.CREDENTIALS_PATH);
            const oauthConfig = credentials.installed || credentials.web;
            if (!oauthConfig) {
                throw new Error('Invalid credentials format');
            }
            const { client_secret, client_id, redirect_uris } = oauthConfig;
            this.oauth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
            // Check if we have a stored token
            if (await fs.pathExists(this.TOKEN_PATH)) {
                const token = await fs.readJson(this.TOKEN_PATH);
                this.oauth2Client.setCredentials(token);
                this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
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
        }
        catch (error) {
            this.log('error', 'Google Drive authentication error:', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Complete authentication with authorization code
     * @param code - Authorization code from OAuth flow
     * @returns Authentication result
     */
    async completeAuth(code) {
        try {
            if (!this.oauth2Client) {
                throw new Error('OAuth client not initialized. Call authenticate() first.');
            }
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            // Save token for future use
            await fs.writeJson(this.TOKEN_PATH, tokens);
            this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
            this.log('info', 'Authentication completed successfully');
            return { authenticated: true };
        }
        catch (error) {
            this.log('error', 'Failed to complete authentication:', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * List files in a Google Drive folder
     * @param folderId - Google Drive folder ID
     * @returns Array of cloud files
     */
    async listFiles(folderId) {
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
        }
        catch (error) {
            this.handleError('listFiles', error);
        }
    }
    /**
     * Download a file from Google Drive
     * @param fileId - Google Drive file ID
     * @param outputPath - Local destination path
     */
    async downloadFile(fileId, outputPath) {
        try {
            await this.ensureAuthenticated();
            if (!this.drive) {
                throw new Error('Drive not initialized');
            }
            const destPath = path.resolve(outputPath);
            await fs.ensureDir(path.dirname(destPath));
            const dest = fs.createWriteStream(destPath);
            const response = await this.drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' });
            await new Promise((resolve, reject) => {
                const stream = response.data;
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
        }
        catch (error) {
            this.handleError(`downloadFile(${fileId})`, error);
        }
    }
    /**
     * Sync an entire folder from Google Drive to local path
     * @param folderId - Google Drive folder ID
     * @param localPath - Local destination path
     */
    async syncFolder(folderId, localPath) {
        try {
            await this.ensureAuthenticated();
            if (!this.drive) {
                throw new Error('Drive not initialized');
            }
            await fs.ensureDir(localPath);
            // Get all files in the folder
            const files = await this.listFiles(folderId);
            const syncedFiles = [];
            for (const file of files) {
                if (file.isFolder) {
                    // Recursively sync subfolders
                    const subfolderPath = path.join(localPath, file.name);
                    await this.syncFolder(file.id, subfolderPath);
                }
                else {
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
                        }
                        catch (err) {
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
        }
        catch (error) {
            this.handleError(`syncFolder(${folderId})`, error);
        }
    }
    /**
     * Ensure the service is authenticated
     * @throws Error if not authenticated
     */
    async ensureAuthenticated() {
        if (!this.drive) {
            const result = await this.performAuthentication();
            if (!result.authenticated) {
                throw new Error('Not authenticated. Please complete authentication flow.');
            }
        }
    }
}
exports.GoogleDriveService = GoogleDriveService;
// ==================== Singleton Export ====================
let googleDriveInstance = null;
/**
 * Get or create the Google Drive service singleton
 */
function getGoogleDriveService(config) {
    if (!googleDriveInstance) {
        googleDriveInstance = new GoogleDriveService(config);
    }
    return googleDriveInstance;
}
// Export for backward compatibility
exports.default = GoogleDriveService;
