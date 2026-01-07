const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'gdrive-token.json');
const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gdrive-credentials.json');

let oauth2Client = null;
let drive = null;

// Authenticate with Google Drive
async function authenticate() {
  try {
    // Check if credentials exist
    if (!await fs.pathExists(CREDENTIALS_PATH)) {
      throw new Error('Google Drive credentials not found. Please add credentials file.');
    }
    
    const credentials = await fs.readJson(CREDENTIALS_PATH);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Check if we have a stored token
    if (await fs.pathExists(TOKEN_PATH)) {
      const token = await fs.readJson(TOKEN_PATH);
      oauth2Client.setCredentials(token);
      drive = google.drive({ version: 'v3', auth: oauth2Client });
      return { authenticated: true };
    }
    
    // Generate auth URL for user to authorize
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    return {
      authenticated: false,
      authUrl: authUrl,
      message: 'Please authorize the application by visiting the URL'
    };
  } catch (error) {
    console.error('Google Drive authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Complete authentication with code
async function completeAuth(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Save token for future use
    await fs.writeJson(TOKEN_PATH, tokens);
    
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    return { authenticated: true };
  } catch (error) {
    console.error('Failed to complete authentication:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// List files in a Google Drive folder
async function listFiles(folderId) {
  try {
    if (!drive) {
      await authenticate();
    }
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'name'
    });
    
    return response.data.files;
  } catch (error) {
    console.error('Failed to list Google Drive files:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

// Download a file from Google Drive
async function downloadFile(fileId, destination) {
  try {
    if (!drive) {
      await authenticate();
    }
    
    const destPath = path.resolve(destination);
    await fs.ensureDir(path.dirname(destPath));
    
    const dest = fs.createWriteStream(destPath);
    
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => {
          console.log(`Downloaded file to ${destPath}`);
          resolve(destPath);
        })
        .on('error', err => {
          console.error('Error downloading file:', err);
          reject(err);
        })
        .pipe(dest);
    });
  } catch (error) {
    console.error('Failed to download file:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

// Sync an entire folder from Google Drive to local path
async function syncFolder(folderId, localPath) {
  try {
    if (!drive) {
      await authenticate();
    }
    
    await fs.ensureDir(localPath);
    
    // Get all files in the folder
    const files = await listFiles(folderId);
    
    const syncedFiles = [];
    
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // Recursively sync subfolders
        const subfolderPath = path.join(localPath, file.name);
        await syncFolder(file.id, subfolderPath);
      } else {
        // Download file if it doesn't exist or is newer on Drive
        const localFilePath = path.join(localPath, file.name);
        const shouldDownload = !await fs.pathExists(localFilePath);
        
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
          await downloadFile(file.id, localFilePath);
          syncedFiles.push({
            name: file.name,
            path: localFilePath,
            size: file.size,
            action: shouldDownload ? 'downloaded' : 'updated'
          });
        }
      }
    }
    
    return {
      success: true,
      syncedFiles,
      totalFiles: files.length
    };
  } catch (error) {
    console.error('Failed to sync folder:', error);
    throw new Error(`Folder sync failed: ${error.message}`);
  }
}

module.exports = {
  authenticate,
  completeAuth,
  listFiles,
  downloadFile,
  syncFolder
};
