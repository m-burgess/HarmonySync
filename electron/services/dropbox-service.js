const { Dropbox } = require('dropbox');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

const TOKEN_PATH = path.join(app.getPath('userData'), 'dropbox-token.json');

let dbx = null;

// Authenticate with Dropbox
async function authenticate() {
  try {
    // Check if we have a stored token
    if (await fs.pathExists(TOKEN_PATH)) {
      const tokenData = await fs.readJson(TOKEN_PATH);
      dbx = new Dropbox({ accessToken: tokenData.accessToken });
      
      // Verify token is valid
      try {
        await dbx.usersGetCurrentAccount();
        return { authenticated: true };
      } catch (err) {
        // Token might be expired, need to re-authenticate
        dbx = null;
        await fs.remove(TOKEN_PATH);
      }
    }
    
    // Need to authenticate - return auth URL
    const clientId = process.env.DROPBOX_CLIENT_ID || '';
    if (!clientId) {
      throw new Error('Dropbox client ID not configured. Please set DROPBOX_CLIENT_ID environment variable.');
    }
    
    const redirectUri = 'http://localhost:3000/dropbox-callback';
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;
    
    return {
      authenticated: false,
      authUrl: authUrl,
      message: 'Please authorize the application by visiting the URL'
    };
  } catch (error) {
    console.error('Dropbox authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Complete authentication with access token
async function completeAuth(accessToken) {
  try {
    dbx = new Dropbox({ accessToken });
    
    // Verify token works
    await dbx.usersGetCurrentAccount();
    
    // Save token for future use
    await fs.writeJson(TOKEN_PATH, { accessToken });
    
    return { authenticated: true };
  } catch (error) {
    console.error('Failed to complete authentication:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// List files in a Dropbox folder
async function listFiles(folderPath = '') {
  try {
    if (!dbx) {
      await authenticate();
    }
    
    const response = await dbx.filesListFolder({
      path: folderPath || '',
      recursive: false
    });
    
    return response.result.entries.map(entry => ({
      id: entry.id,
      name: entry.name,
      path: entry.path_display,
      isFolder: entry['.tag'] === 'folder',
      size: entry.size,
      modifiedTime: entry.server_modified
    }));
  } catch (error) {
    console.error('Failed to list Dropbox files:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

// Download a file from Dropbox
async function downloadFile(dropboxPath, destination) {
  try {
    if (!dbx) {
      await authenticate();
    }
    
    const destPath = path.resolve(destination);
    await fs.ensureDir(path.dirname(destPath));
    
    const response = await dbx.filesDownload({ path: dropboxPath });
    
    await fs.writeFile(destPath, response.result.fileBinary);
    
    console.log(`Downloaded file to ${destPath}`);
    return destPath;
  } catch (error) {
    console.error('Failed to download file:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

// Sync a folder from Dropbox to local path
async function syncFolder(dropboxPath, localPath) {
  try {
    if (!dbx) {
      await authenticate();
    }
    
    await fs.ensureDir(localPath);
    
    // Get all files in the folder
    const entries = await listFiles(dropboxPath);
    
    const syncedFiles = [];
    
    for (const entry of entries) {
      if (entry.isFolder) {
        // Recursively sync subfolders
        const subfolderPath = path.join(localPath, entry.name);
        await syncFolder(entry.path, subfolderPath);
      } else {
        // Download file if it doesn't exist or is newer on Dropbox
        const localFilePath = path.join(localPath, entry.name);
        const shouldDownload = !await fs.pathExists(localFilePath);
        
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
          await downloadFile(entry.path, localFilePath);
          syncedFiles.push({
            name: entry.name,
            path: localFilePath,
            size: entry.size,
            action: shouldDownload ? 'downloaded' : 'updated'
          });
        }
      }
    }
    
    return {
      success: true,
      syncedFiles,
      totalFiles: entries.length
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
