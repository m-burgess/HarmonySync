"use strict";
/**
 * Dropbox Service
 * Handles Dropbox OAuth authentication and file operations
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
exports.DropboxService = void 0;
exports.getDropboxService = getDropboxService;
const dropbox_1 = require("dropbox");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
// ==================== Dropbox Service Class ====================
/**
 * Dropbox Service Implementation
 * Provides OAuth2 authentication and file sync capabilities for Dropbox
 */
class DropboxService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'DropboxService';
        this.dbx = null;
        this.TOKEN_PATH = path.join(electron_1.app.getPath('userData'), 'dropbox-token.json');
    }
    /**
     * Initialize the Dropbox service
     */
    async onInitialize() {
        this.log('info', 'Dropbox service initialized');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.dbx = null;
        this.log('info', 'Dropbox service disposed');
    }
    /**
     * Authenticate with Dropbox
     * @returns True if authenticated, false otherwise
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
            // Check if we have a stored token
            if (await fs.pathExists(this.TOKEN_PATH)) {
                const tokenData = await fs.readJson(this.TOKEN_PATH);
                this.dbx = new dropbox_1.Dropbox({ accessToken: tokenData.accessToken });
                // Verify token is valid
                try {
                    await this.dbx.usersGetCurrentAccount();
                    this.log('info', 'Authenticated with stored token');
                    return { authenticated: true };
                }
                catch (err) {
                    // Token might be expired, need to re-authenticate
                    this.log('warn', 'Stored token is invalid, re-authentication required');
                    this.dbx = null;
                    await fs.remove(this.TOKEN_PATH);
                }
            }
            // Need to authenticate - return auth URL
            const clientId = process.env.DROPBOX_CLIENT_ID || '';
            if (!clientId) {
                throw new Error('Dropbox client ID not configured. Please set DROPBOX_CLIENT_ID environment variable.');
            }
            const redirectUri = 'http://localhost:3000/dropbox-callback';
            const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;
            this.log('info', 'Authentication URL generated');
            return {
                authenticated: false,
                authUrl: authUrl,
                message: 'Please authorize the application by visiting the URL',
            };
        }
        catch (error) {
            this.log('error', 'Dropbox authentication error:', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Complete authentication with access token
     * @param accessToken - Access token from OAuth flow
     * @returns Authentication result
     */
    async completeAuth(accessToken) {
        try {
            this.dbx = new dropbox_1.Dropbox({ accessToken });
            // Verify token works
            await this.dbx.usersGetCurrentAccount();
            // Save token for future use
            await fs.writeJson(this.TOKEN_PATH, { accessToken });
            this.log('info', 'Authentication completed successfully');
            return { authenticated: true };
        }
        catch (error) {
            this.log('error', 'Failed to complete authentication:', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * List files in a Dropbox folder
     * @param folderPath - Dropbox folder path (empty string for root)
     * @returns Array of cloud files
     */
    async listFiles(folderPath = '') {
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
        }
        catch (error) {
            this.handleError('listFiles', error);
        }
    }
    /**
     * Download a file from Dropbox
     * @param dropboxPath - Path to file in Dropbox
     * @param outputPath - Local destination path
     */
    async downloadFile(dropboxPath, outputPath) {
        try {
            await this.ensureAuthenticated();
            if (!this.dbx) {
                throw new Error('Dropbox client not initialized');
            }
            const destPath = path.resolve(outputPath);
            await fs.ensureDir(path.dirname(destPath));
            const response = await this.dbx.filesDownload({ path: dropboxPath });
            // The response contains a fileBinary property with the file content
            const fileData = response.result.fileBinary;
            if (!fileData) {
                throw new Error('No file data received from Dropbox');
            }
            await fs.writeFile(destPath, fileData);
            this.log('debug', `Downloaded file to ${destPath}`);
        }
        catch (error) {
            this.handleError(`downloadFile(${dropboxPath})`, error);
        }
    }
    /**
     * Sync a folder from Dropbox to local path
     * @param dropboxPath - Path to folder in Dropbox
     * @param localPath - Local destination path
     */
    async syncFolder(dropboxPath, localPath) {
        try {
            await this.ensureAuthenticated();
            if (!this.dbx) {
                throw new Error('Dropbox client not initialized');
            }
            await fs.ensureDir(localPath);
            // Get all files in the folder
            const entries = await this.listFiles(dropboxPath);
            const syncedFiles = [];
            for (const entry of entries) {
                if (entry.isFolder) {
                    // Recursively sync subfolders
                    const subfolderPath = path.join(localPath, entry.name);
                    await this.syncFolder(entry.path, subfolderPath);
                }
                else {
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
                        }
                        catch (err) {
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
        }
        catch (error) {
            this.handleError(`syncFolder(${dropboxPath})`, error);
        }
    }
    /**
     * Map Dropbox entries to CloudFile format
     * @param entries - Dropbox file/folder entries
     * @returns Array of cloud files
     */
    mapDropboxEntries(entries) {
        return entries.map((entry) => {
            const isFolder = entry['.tag'] === 'folder';
            const fileEntry = entry;
            return {
                id: entry.id || entry.name, // Dropbox may not always have id field
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
    async ensureAuthenticated() {
        if (!this.dbx) {
            const result = await this.performAuthentication();
            if (!result.authenticated) {
                throw new Error('Not authenticated. Please complete authentication flow.');
            }
        }
    }
}
exports.DropboxService = DropboxService;
// ==================== Singleton Export ====================
let dropboxInstance = null;
/**
 * Get or create the Dropbox service singleton
 */
function getDropboxService(config) {
    if (!dropboxInstance) {
        dropboxInstance = new DropboxService(config);
    }
    return dropboxInstance;
}
// Export for backward compatibility
exports.default = DropboxService;
