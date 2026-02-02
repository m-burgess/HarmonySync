// Forwarder: implementation moved to apps/electron-app/services/dropbox-service.ts
export * from '../../apps/electron-app/services/dropbox-service';
export { default } from '../../apps/electron-app/services/dropbox-service';
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
