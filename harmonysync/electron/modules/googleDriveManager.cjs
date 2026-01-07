const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

/**
 * Google Drive Manager Module
 * Handles Google Drive authentication and file operations
 */

// OAuth2 client configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'google-drive-token.json');
const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'google-drive-credentials.json');

let oAuth2Client = null;
let drive = null;

/**
 * Initialize OAuth2 client
 * @returns {Promise<object>} OAuth2 client
 */
async function getAuth2Client() {
  if (oAuth2Client) {
    return oAuth2Client;
  }

  // Check if credentials exist
  if (!await fs.pathExists(CREDENTIALS_PATH)) {
    throw new Error('Google Drive credentials not found. Please configure OAuth2 credentials.');
  }

  const credentials = await fs.readJSON(CREDENTIALS_PATH);
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have a saved token
  if (await fs.pathExists(TOKEN_PATH)) {
    const token = await fs.readJSON(TOKEN_PATH);
    oAuth2Client.setCredentials(token);
  }

  return oAuth2Client;
}

/**
 * Authenticate with Google Drive
 * @returns {Promise<object>} Authentication status and URL if needed
 */
async function authenticate() {
  try {
    const auth = await getAuth2Client();

    // Check if we already have valid credentials
    if (auth.credentials && auth.credentials.access_token) {
      drive = google.drive({ version: 'v3', auth });
      return { 
        success: true, 
        authenticated: true,
        message: 'Already authenticated' 
      };
    }

    // Generate auth URL for user to visit
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    return {
      success: true,
      authenticated: false,
      auth_url: authUrl,
      message: 'Please visit the auth URL to authenticate'
    };
  } catch (error) {
    console.error('Google Drive authentication error:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback with authorization code
 * @param {string} code - Authorization code from OAuth flow
 * @returns {Promise<object>} Authentication result
 */
async function handleAuthCode(code) {
  try {
    const auth = await getAuth2Client();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    // Save the token
    await fs.writeJSON(TOKEN_PATH, tokens);

    drive = google.drive({ version: 'v3', auth });

    return { success: true, message: 'Authentication successful' };
  } catch (error) {
    console.error('Error handling auth code:', error);
    throw error;
  }
}

/**
 * List files in a Google Drive folder
 * @param {string} folderId - Folder ID (or 'root')
 * @returns {Promise<Array>} List of files
 */
async function listFiles(folderId = 'root') {
  try {
    if (!drive) {
      const auth = await getAuth2Client();
      drive = google.drive({ version: 'v3', auth });
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      pageSize: 1000
    });

    return {
      success: true,
      files: response.data.files
    };
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    throw error;
  }
}

/**
 * Download a file from Google Drive
 * @param {string} fileId - File ID
 * @param {string} destination - Local destination path
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} Download result
 */
async function downloadFile(fileId, destination, progressCallback) {
  try {
    if (!drive) {
      const auth = await getAuth2Client();
      drive = google.drive({ version: 'v3', auth });
    }

    // Get file metadata first
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'name, size'
    });

    const fileName = metadata.data.name;
    const fileSize = parseInt(metadata.data.size) || 0;

    // Ensure destination directory exists
    await fs.ensureDir(path.dirname(destination));

    const dest = fs.createWriteStream(destination);
    let downloadedBytes = 0;

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      response.data
        .on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (progressCallback && fileSize > 0) {
            const progress = Math.floor((downloadedBytes / fileSize) * 100);
            progressCallback({
              file_name: fileName,
              progress: progress,
              message: `Downloading: ${progress}%`
            });
          }
        })
        .on('end', () => {
          resolve({
            success: true,
            path: destination,
            message: 'File downloaded successfully'
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .pipe(dest);
    });
  } catch (error) {
    console.error('Error downloading file from Google Drive:', error);
    throw error;
  }
}

/**
 * Sync entire folder from Google Drive to local path
 * @param {string} folderId - Google Drive folder ID
 * @param {string} localPath - Local destination path
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} Sync result
 */
async function syncFolder(folderId, localPath, progressCallback) {
  try {
    await fs.ensureDir(localPath);

    // List all files in the folder
    const result = await listFiles(folderId);
    const files = result.files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    let completed = 0;
    const downloadedFiles = [];

    for (const file of files) {
      const filePath = path.join(localPath, file.name);
      
      // Check if file already exists and is up to date
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        const localModified = new Date(stats.mtime);
        const driveModified = new Date(file.modifiedTime);
        
        if (localModified >= driveModified) {
          // File is up to date, skip
          completed++;
          continue;
        }
      }

      // Download the file
      await downloadFile(file.id, filePath, (progress) => {
        if (progressCallback) {
          const overallProgress = Math.floor((completed / files.length) * 100);
          progressCallback({
            file_name: file.name,
            progress: overallProgress,
            message: `Syncing: ${completed + 1}/${files.length} files`
          });
        }
      });

      downloadedFiles.push(file.name);
      completed++;
    }

    return {
      success: true,
      files_synced: completed,
      downloaded_files: downloadedFiles,
      message: 'Folder synced successfully'
    };
  } catch (error) {
    console.error('Error syncing folder from Google Drive:', error);
    throw error;
  }
}

module.exports = {
  authenticate,
  handleAuthCode,
  listFiles,
  downloadFile,
  syncFolder
};
