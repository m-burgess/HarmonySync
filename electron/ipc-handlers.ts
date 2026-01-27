import { dialog, IpcMain, BrowserWindow, screen } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';

// Type definitions
interface WindowGetter {
  (): BrowserWindow | null;
}

interface Services {
  mainWindow: WindowGetter;
  audienceWindow: WindowGetter;
  confidenceWindow: WindowGetter;
  lowerThirdsWindow: WindowGetter;
  jsonStorage: any;
  ffmpegService: any;
  audioService: any;
  videoService: any;
  youtubeService: any;
  imageService: any;
  textService: any;
  displayService: any;
  windowService: any;
  macroService: any;
  schedulerService: any;
  httpServer: any;
  remoteControlService: any;
  midiManager: any;
  lyricsFetcher: any;
  fileManager: any;
  googleDriveService: any;
  dropboxService: any;
  scriptService: any;
  scriptingAPI: any;
  slidesService: any;
  displayConfigService: any;
}

interface DialogOpenDirectoryOptions {
  multiple?: boolean;
}

/**
 * IPC Handler Manager
 * Centralizes all IPC channel registration with type safety and error handling
 */
class IPCHandlerManager {
  private ipcMain: IpcMain;
  private services: Services;

  constructor(ipcMain: IpcMain, services: Services) {
    this.ipcMain = ipcMain;
    this.services = services;
  }

  /**
   * Register all IPC handlers
   */
  public registerAll(): void {
    this.registerDialogHandlers();
    this.registerFileSystemHandlers();
    this.registerDatabaseHandlers();
    this.registerFFmpegHandlers();
    this.registerVideoServiceHandlers();
    this.registerYouTubeServiceHandlers();
    this.registerImageServiceHandlers();
    this.registerTextServiceHandlers();
    this.registerSetlistHandlers();
    this.registerMIDIHandlers();
    this.registerLyricsHandlers();
    this.registerCloudStorageHandlers();
    this.registerScriptHandlers();
    this.registerEventTriggerHandlers();
    this.registerTemplateHandlers();
    this.registerHTTPServerHandlers();
    this.registerRemoteControlHandlers();
    this.registerCSSHandlers();
    this.registerSendHandlers();
    this.registerAudioServiceHandlers();
    this.registerDisplayServiceHandlers();
    this.registerWindowServiceHandlers();
    this.registerModalWindowHandlers();
    this.registerMacroHandlers();
    this.registerSchedulerHandlers();
    this.registerSlidesHandlers();
    this.registerSettingsHandlers();
    this.registerDisplayConfigHandlers();
    this.registerRemoteControlEventHandlers();
  }

  /**
   * Dialog handlers
   */
  private registerDialogHandlers(): void {
    this.ipcMain.handle(
      'dialog:openDirectory',
      async (_event, options: DialogOpenDirectoryOptions = {}) => {
        const properties: ('openDirectory' | 'multiSelections')[] = ['openDirectory'];
        if (options.multiple) properties.push('multiSelections');
        console.log('[ipc-handlers] dialog:openDirectory called with properties', properties);

        const result = await dialog.showOpenDialog({ properties });
        console.log('[ipc-handlers] dialog:openDirectory result', result.filePaths);
        return result.filePaths || [];
      }
    );

    this.ipcMain.handle('dialog:selectFolders', async (_event, options: { title?: string } = {}) => {
      const result = await dialog.showOpenDialog({
        title: options.title || 'Select Folders',
        properties: ['openDirectory', 'multiSelections'],
      });
      return {
        canceled: result.canceled,
        filePaths: result.filePaths || [],
      };
    });

    this.ipcMain.handle('dialog:openFile', async (_event, filters: Electron.FileFilter[]) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters || [],
      });
      return result.filePaths[0];
    });
  }

  /**
   * File system handlers
   */
  private registerFileSystemHandlers(): void {
    this.ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
      return await this.services.fileManager.readFile(filePath);
    });

    this.ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
      return await this.services.fileManager.writeFile(filePath, content);
    });

    this.ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
      return await this.services.fileManager.readDir(dirPath);
    });

    this.ipcMain.handle('fs:exists', async (_event, filePath: string) => {
      return await this.services.fileManager.exists(filePath);
    });

    this.ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
      return await this.services.fileManager.mkdir(dirPath);
    });

    this.ipcMain.handle('fs:copyFile', async (_event, src: string, dest: string) => {
      return await this.services.fileManager.copyFile(src, dest);
    });
  }

  /**
   * Database handlers (legacy compatibility)
   */
  private registerDatabaseHandlers(): void {
    this.ipcMain.handle('db:query', async (_event, query: string, params?: any[]) => {
      return await this.services.jsonStorage.query(query, params);
    });

    this.ipcMain.handle('db:run', async (_event, query: string, params?: any[]) => {
      return await this.services.jsonStorage.run(query, params);
    });

    this.ipcMain.handle('db:get', async (_event, query: string, params?: any[]) => {
      return await this.services.jsonStorage.get(query, params);
    });

    this.ipcMain.handle('db:all', async (_event, query: string, params?: any[]) => {
      return await this.services.jsonStorage.all(query, params);
    });
  }

  /**
   * FFmpeg handlers
   */
  private registerFFmpegHandlers(): void {
    this.ipcMain.handle('ffmpeg:convertToOgg', async (_event, inputPath: string, outputDir: string) => {
      return await this.services.ffmpegService.convertToOgg(inputPath, outputDir, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('ogg-conversion-progress', progress);
      });
    });

    this.ipcMain.handle('ffmpeg:transposeAudio', async (_event, songPath: string, semitones: number) => {
      return await this.services.ffmpegService.transposeAudio(songPath, semitones, (tracks: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('tracks-updated', tracks);
      });
    });

    this.ipcMain.handle('ffmpeg:getVideoMetadata', async (_event, videoPath: string) => {
      return await this.services.videoService.getVideoMetadata(videoPath);
    });

    this.ipcMain.handle('ffmpeg:transcodeVideo', async (_event, inputPath: string) => {
      return await this.services.videoService.transcodeVideo(inputPath, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('video-transcode-progress', progress);
      });
    });

    this.ipcMain.handle('ffmpeg:generateThumbnail', async (_event, videoPath: string) => {
      return await this.services.videoService.generateThumbnail(videoPath);
    });
  }

  /**
   * Video Service handlers
   */
  private registerVideoServiceHandlers(): void {
    this.ipcMain.handle('video:getMetadata', async (_event, videoPath: string) => {
      return await this.services.videoService.getVideoMetadata(videoPath);
    });

    this.ipcMain.handle('video:transcode', async (_event, inputPath: string) => {
      return await this.services.videoService.transcodeVideo(inputPath, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('video-transcode-progress', progress);
      });
    });

    this.ipcMain.handle('video:generateThumbnail', async (_event, videoPath: string, timestamp?: number, size?: any) => {
      return await this.services.videoService.generateThumbnail(videoPath, timestamp, size);
    });

    this.ipcMain.handle('video:getDuration', async (_event, videoPath: string) => {
      return await this.services.videoService.getVideoDuration(videoPath);
    });

    this.ipcMain.handle('video:needsTranscoding', async (_event, videoPath: string) => {
      return await this.services.videoService.needsTranscoding(videoPath);
    });

    this.ipcMain.handle('video:optimizeForStreaming', async (_event, inputPath: string) => {
      return await this.services.videoService.optimizeForStreaming(inputPath);
    });

    this.ipcMain.handle('video:extractFrames', async (_event, videoPath: string, intervalSeconds: number) => {
      return await this.services.videoService.extractFrames(videoPath, intervalSeconds);
    });
  }

  /**
   * YouTube Service handlers
   */
  private registerYouTubeServiceHandlers(): void {
    this.ipcMain.handle('youtube:transcodeForUpload', async (_event, inputPath: string) => {
      return await this.services.youtubeService.transcodeForYouTube(inputPath, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('youtube-transcode-progress', progress);
      });
    });

    this.ipcMain.handle('youtube:validate', async (_event, videoPath: string) => {
      return await this.services.youtubeService.validateForYouTube(videoPath);
    });

    this.ipcMain.handle('youtube:addLink', async (_event, presentationPath: string, url: string) => {
      return await this.services.jsonStorage.addYouTubeLink(presentationPath, url);
    });

    this.ipcMain.handle('youtube:getLinks', async (_event, presentationPath: string) => {
      return await this.services.jsonStorage.getYouTubeLinks(presentationPath);
    });

    this.ipcMain.handle('youtube:deleteLink', async (_event, presentationPath: string, url: string) => {
      return await this.services.jsonStorage.deleteYouTubeLink(presentationPath, url);
    });

    this.ipcMain.handle('youtube:extractId', async (_event, url: string) => {
      return this.services.youtubeService.extractYouTubeId(url);
    });

    this.ipcMain.handle('youtube:getThumbnailUrl', async (_event, videoIdOrUrl: string, quality?: string) => {
      return this.services.youtubeService.getYouTubeThumbnailUrl(videoIdOrUrl, quality);
    });

    this.ipcMain.handle('youtube:isValidUrl', async (_event, url: string) => {
      return this.services.youtubeService.isValidYouTubeUrl(url);
    });

    this.ipcMain.handle('youtube:generateEmbedUrl', async (_event, videoIdOrUrl: string, options?: any) => {
      return this.services.youtubeService.generateEmbedUrl(videoIdOrUrl, options);
    });
  }

  /**
   * Image Service handlers
   */
  private registerImageServiceHandlers(): void {
    this.ipcMain.handle('image:getMetadata', async (_event, imagePath: string) => {
      return await this.services.imageService.getImageMetadata(imagePath);
    });

    this.ipcMain.handle('image:generateThumbnail', async (_event, imagePath: string, width?: number, height?: number) => {
      return await this.services.imageService.generateThumbnail(imagePath, width, height);
    });

    this.ipcMain.handle('image:convertFormat', async (_event, inputPath: string, format: string, options?: any) => {
      return await this.services.imageService.convertFormat(inputPath, format, options);
    });

    this.ipcMain.handle('image:resize', async (_event, imagePath: string, width: number, height: number, options?: any) => {
      return await this.services.imageService.resizeImage(imagePath, width, height, options);
    });

    this.ipcMain.handle('image:optimizeForWeb', async (_event, imagePath: string) => {
      return await this.services.imageService.optimizeForWeb(imagePath);
    });

    this.ipcMain.handle('image:addTextOverlay', async (_event, imagePath: string, text: string, options?: any) => {
      return await this.services.imageService.addTextOverlay(imagePath, text, options);
    });

    this.ipcMain.handle('image:loadAndCache', async (_event, imagePath: string) => {
      return await this.services.imageService.loadAndCache(imagePath);
    });

    this.ipcMain.handle('image:clearCache', async (_event, olderThanDays?: number) => {
      return await this.services.imageService.clearCache(olderThanDays);
    });

    this.ipcMain.handle('image:getDominantColor', async (_event, imagePath: string) => {
      return await this.services.imageService.getDominantColor(imagePath);
    });

    this.ipcMain.handle('image:isSupportedFormat', async (_event, filePath: string) => {
      return this.services.imageService.isSupportedImage(filePath);
    });
  }

  /**
   * Text Service handlers
   */
  private registerTextServiceHandlers(): void {
    this.ipcMain.handle('text:generateBackgroundCSS', async (_event, options: any) => {
      return this.services.textService.generateBackgroundCSS(options);
    });

    this.ipcMain.handle('text:generateAndSaveCSS', async (_event, dirPath: string, options: any) => {
      return await this.services.textService.generateAndSaveCSS(dirPath, options);
    });

    this.ipcMain.handle('text:formatLyrics', async (_event, lyrics: string) => {
      return this.services.textService.formatLyrics(lyrics);
    });

    this.ipcMain.handle('text:splitLyricsIntoSlides', async (_event, lyrics: string, linesPerSlide: number) => {
      return this.services.textService.splitLyricsIntoSlides(lyrics, linesPerSlide);
    });

    this.ipcMain.handle('text:generateSlideHTML', async (_event, text: string, style: any) => {
      return this.services.textService.generateSlideHTML(text, style);
    });

    this.ipcMain.handle('text:extractTextFromFile', async (_event, filePath: string) => {
      return await this.services.textService.extractTextFromFile(filePath);
    });

    this.ipcMain.handle('text:wordWrap', async (_event, text: string, maxWidth: number) => {
      return this.services.textService.wordWrap(text, maxWidth);
    });

    this.ipcMain.handle('text:generateTextCSS', async (_event, style: any) => {
      return this.services.textService.generateTextCSS(style);
    });

    this.ipcMain.handle('text:getTextStats', async (_event, text: string) => {
      return this.services.textService.getTextStats(text);
    });
  }

  /**
   * Setlist handlers
   */
  private registerSetlistHandlers(): void {
    this.ipcMain.handle('setlist:loadSongMetadata', async (_event, folderPath: string) => {
      try {
        const path = require('path');
        const fs = require('fs-extra');
        
        // Get folder name from path
        const folderName = path.basename(folderPath);
        
        // Try to read files in folder to get metadata
        let files: string[] = [];
        try {
          files = await fs.readdir(folderPath);
        } catch (error) {
          console.error('[setlist:loadSongMetadata] Error reading directory:', error);
        }
        
        return {
          path: folderPath,
          name: folderName,
          files,
          id: folderName,
        };
      } catch (error) {
        console.error('[setlist:loadSongMetadata] Error:', error);
        return { path: folderPath, name: folderPath.split(/[\\/]/).pop() || folderPath, files: [] };
      }
    });

    this.ipcMain.handle('setlist:loadLyrics', async (_event, songPath: string) => {
      try {
        const path = require('path');
        const fs = require('fs-extra');
        const lyricsPath = path.join(songPath, 'lyrics.txt');
        return await fs.readFile(lyricsPath, 'utf8');
      } catch (error) {
        return null;
      }
    });

    this.ipcMain.handle('setlist:openLyricsFile', async (_event, songPath: string) => {
      try {
        const path = require('path');
        const { shell } = require('electron');
        const lyricsPath = path.join(songPath, 'lyrics.txt');
        await shell.openPath(lyricsPath);
      } catch (error) {
        console.error('[setlist:openLyricsFile] Error:', error);
      }
    });
  }

  /**
   * MIDI handlers
   */
  private registerMIDIHandlers(): void {
    this.ipcMain.handle('midi:getDevices', async () => {
      if (!this.services.midiManager) {
        return [];
      }
      return await this.services.midiManager.getDevices();
    });

    this.ipcMain.handle('midi:sendNote', async (_event, device: string, note: number, velocity: number, duration: number) => {
      if (!this.services.midiManager) {
        return false;
      }
      return await this.services.midiManager.sendNote(device, note, velocity, duration);
    });
  }

  /**
   * Lyrics handlers
   */
  private registerLyricsHandlers(): void {
    this.ipcMain.handle('lyrics:search', async (_event, title: string, artist: string) => {
      return await this.services.lyricsFetcher.search(title, artist);
    });

    this.ipcMain.handle('lyrics:fetch', async (_event, songId: string) => {
      return await this.services.lyricsFetcher.fetch(songId);
    });
  }

  /**
   * Cloud Storage handlers (Google Drive & Dropbox)
   */
  private registerCloudStorageHandlers(): void {
    // Google Drive
    this.ipcMain.handle('gdrive:auth', async () => {
      return await this.services.googleDriveService.authenticate();
    });

    this.ipcMain.handle('gdrive:listFiles', async (_event, folderId?: string) => {
      return await this.services.googleDriveService.listFiles(folderId);
    });

    this.ipcMain.handle('gdrive:downloadFile', async (_event, fileId: string, destination: string) => {
      return await this.services.googleDriveService.downloadFile(fileId, destination);
    });

    this.ipcMain.handle('gdrive:syncFolder', async (_event, folderId: string, localPath: string) => {
      return await this.services.googleDriveService.syncFolder(folderId, localPath);
    });

    // Dropbox
    this.ipcMain.handle('dropbox:auth', async () => {
      return await this.services.dropboxService.authenticate();
    });

    this.ipcMain.handle('dropbox:listFiles', async (_event, dropboxPath: string) => {
      return await this.services.dropboxService.listFiles(dropboxPath);
    });

    this.ipcMain.handle('dropbox:downloadFile', async (_event, dropboxPath: string, destination: string) => {
      return await this.services.dropboxService.downloadFile(dropboxPath, destination);
    });

    this.ipcMain.handle('dropbox:syncFolder', async (_event, dropboxPath: string, localPath: string) => {
      return await this.services.dropboxService.syncFolder(dropboxPath, localPath);
    });
  }

  /**
   * Script handlers
   */
  private registerScriptHandlers(): void {
    this.ipcMain.handle('script:getAll', async () => {
      return await this.services.scriptService.getAllScripts();
    });

    this.ipcMain.handle('script:get', async (_event, scriptId: string) => {
      return await this.services.scriptService.getScript(scriptId);
    });

    this.ipcMain.handle('script:create', async (_event, scriptData: any) => {
      return await this.services.scriptService.createScript(scriptData);
    });

    this.ipcMain.handle('script:update', async (_event, scriptId: string, updates: any) => {
      return await this.services.scriptService.updateScript(scriptId, updates);
    });

    this.ipcMain.handle('script:delete', async (_event, scriptId: string) => {
      return await this.services.scriptService.deleteScript(scriptId);
    });

    this.ipcMain.handle('script:validate', async (_event, code: string) => {
      return this.services.scriptService.validateScript(code);
    });

    this.ipcMain.handle('script:execute', async (_event, scriptId: string, options?: any) => {
      const harmonyAPI = this.services.scriptingAPI.createHarmonySyncAPI(this.services);
      return await this.services.scriptService.executeScript(scriptId, harmonyAPI, options);
    });

    this.ipcMain.handle('script:export', async (_event, scriptId: string, exportPath: string) => {
      return await this.services.scriptService.exportScript(scriptId, exportPath);
    });

    this.ipcMain.handle('script:import', async (_event, importPath: string) => {
      return await this.services.scriptService.importScript(importPath);
    });
  }

  /**
   * Event Trigger handlers
   */
  private registerEventTriggerHandlers(): void {
    const eventTriggerService = require('./services/event-trigger-service');

    this.ipcMain.handle('trigger:register', async (_event, eventType: string, scriptId: string, options?: any) => {
      return await eventTriggerService.registerTrigger(eventType, scriptId, options);
    });

    this.ipcMain.handle('trigger:unregister', async (_event, triggerId: string) => {
      return await eventTriggerService.unregisterTrigger(triggerId);
    });

    this.ipcMain.handle('trigger:getAll', async () => {
      return await eventTriggerService.getAllTriggers();
    });

    this.ipcMain.handle('trigger:enable', async (_event, triggerId: string) => {
      return await eventTriggerService.enableTrigger(triggerId);
    });

    this.ipcMain.handle('trigger:disable', async (_event, triggerId: string) => {
      return await eventTriggerService.disableTrigger(triggerId);
    });

    this.ipcMain.handle('trigger:test', async (_event, triggerId: string, testData?: any) => {
      return await eventTriggerService.testTrigger(triggerId, testData);
    });

    this.ipcMain.handle('event:list', async () => {
      return eventTriggerService.getEventTypes();
    });

    this.ipcMain.handle('event:emit', async (_event, eventType: string, eventData?: any) => {
      return await eventTriggerService.emitEvent(eventType, eventData);
    });
  }

  /**
   * Script Template handlers
   */
  private registerTemplateHandlers(): void {
    this.ipcMain.handle('template:getAll', async () => {
      const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
      try {
        const files = await fs.readdir(templatesDir);
        const templates = files.filter((f: string) => f.endsWith('.js'));

        const templateList = [];
        for (const file of templates) {
          const filePath = path.join(templatesDir, file);
          const content = await fs.readFile(filePath, 'utf8');

          // Extract metadata
          const nameMatch = content.match(/@name\s+(.+)/);
          const descMatch = content.match(/@description\s+(.+)/);

          templateList.push({
            id: path.basename(file, '.js'),
            name: nameMatch ? nameMatch[1] : file,
            description: descMatch ? descMatch[1] : '',
            filename: file,
          });
        }

        return templateList;
      } catch (error) {
        console.error('Failed to load templates:', error);
        return [];
      }
    });

    this.ipcMain.handle('template:get', async (_event, templateId: string) => {
      const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
      const templatePath = path.join(templatesDir, `${templateId}.js`);

      if (await fs.pathExists(templatePath)) {
        return await fs.readFile(templatePath, 'utf8');
      } else {
        throw new Error(`Template not found: ${templateId}`);
      }
    });

    this.ipcMain.handle('template:load', async (_event, templateId: string) => {
      const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
      const templatePath = path.join(templatesDir, `${templateId}.js`);

      if (await fs.pathExists(templatePath)) {
        const content = await fs.readFile(templatePath, 'utf8');
        return {
          id: templateId,
          code: content,
        };
      } else {
        throw new Error(`Template not found: ${templateId}`);
      }
    });
  }

  /**
   * HTTP Server handlers
   */
  private registerHTTPServerHandlers(): void {
    this.ipcMain.handle('http:getServerUrl', async () => {
      return this.services.httpServer.getUrl();
    });
  }

  /**
   * Remote Control Service handlers
   */
  private registerRemoteControlHandlers(): void {
    this.ipcMain.handle('remote:getUrl', async () => {
      return this.services.remoteControlService.getUrl();
    });

    this.ipcMain.handle('remote:getState', async () => {
      return this.services.remoteControlService.getState();
    });

    this.ipcMain.handle('remote:updateState', async (_event, updates: any) => {
      this.services.remoteControlService.updateState(updates);
      return { success: true };
    });

    this.ipcMain.handle('remote:setSetlistDirectory', async (_event, directory: string) => {
      this.services.remoteControlService.setSetlistDirectory(directory);
      return { success: true };
    });
  }

  /**
   * CSS generation (legacy support)
   */
  private registerCSSHandlers(): void {
    this.ipcMain.handle('css:generateBackground', async (_event, dirPath: string) => {
      return await this.services.textService.generateAndSaveCSS(dirPath);
    });
  }

  /**
   * Send to specific windows
   */
  private registerSendHandlers(): void {
    this.ipcMain.handle('send:audience', async (_event, channel: string, data: any) => {
      const win = this.services.audienceWindow();
      if (win) {
        win.webContents.send(channel, data);
      }
    });

    this.ipcMain.handle('send:confidence', async (_event, channel: string, data: any) => {
      const win = this.services.confidenceWindow();
      if (win) {
        win.webContents.send(channel, data);
      }
    });

    this.ipcMain.handle('send:lowerThirds', async (_event, channel: string, data: any) => {
      const win = this.services.lowerThirdsWindow();
      if (win) {
        win.webContents.send(channel, data);
      }
    });
  }

  /**
   * Audio Service handlers
   */
  private registerAudioServiceHandlers(): void {
    this.ipcMain.handle('audio:convertToOgg', async (_event, inputPath: string, outputDir: string) => {
      return await this.services.audioService.convertToOgg(inputPath, outputDir, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('ogg-conversion-progress', progress);
      });
    });

    this.ipcMain.handle('audio:transposeAudio', async (_event, songPath: string, semitones: number) => {
      return await this.services.audioService.transposeAudio(songPath, semitones, (tracks: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('tracks-updated', tracks);
      });
    });

    this.ipcMain.handle('audio:ensureSync', async (_event, audioFiles: string[]) => {
      return await this.services.audioService.ensureAudioSync(audioFiles);
    });

    this.ipcMain.handle('audio:getMetadata', async (_event, audioPath: string) => {
      return await this.services.audioService.getAudioMetadata(audioPath);
    });

    this.ipcMain.handle('audio:normalize', async (_event, inputPath: string, targetLevel?: number) => {
      return await this.services.audioService.normalizeAudio(inputPath, targetLevel);
    });

    // Playback control handlers (proxy to audio service on port 3001)
    this.ipcMain.handle('audio:loadTracks', async (_event, folderPath: string) => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/tracks/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath }),
        });
        return await response.json();
      } catch (error) {
        console.error('[audio:loadTracks] Error:', error);
        return [];
      }
    });

    this.ipcMain.handle('audio:transpose', async (_event, sourcePath: string, semitones: number) => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/transpose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourcePath, semitones }),
        });
        return await response.json();
      } catch (error) {
        console.error('[audio:transpose] Error:', error);
        return { success: false };
      }
    });

    this.ipcMain.handle('audio:play', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/play', { method: 'POST' });
      } catch (error) {
        console.error('[audio:play] Error:', error);
      }
    });

    this.ipcMain.handle('audio:stop', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/stop', { method: 'POST' });
      } catch (error) {
        console.error('[audio:stop] Error:', error);
      }
    });

    this.ipcMain.handle('audio:pause', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/pause', { method: 'POST' });
      } catch (error) {
        console.error('[audio:pause] Error:', error);
      }
    });

    this.ipcMain.handle('audio:seek', async (_event, position: number) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/seek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position }),
        });
      } catch (error) {
        console.error('[audio:seek] Error:', error);
      }
    });

    this.ipcMain.handle('audio:setTrackVolume', async (_event, trackIndex: number, volume: number) => {
      try {
        await fetch('http://127.0.0.1:3001/api/tracks/volume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackIndex, volume }),
        });
      } catch (error) {
        console.error('[audio:setTrackVolume] Error:', error);
      }
    });

    this.ipcMain.handle('audio:setTrackPan', async (_event, trackIndex: number, pan: number) => {
      try {
        await fetch('http://127.0.0.1:3001/api/tracks/pan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackIndex, pan }),
        });
      } catch (error) {
        console.error('[audio:setTrackPan] Error:', error);
      }
    });

    this.ipcMain.handle('audio:setTrackMute', async (_event, trackIndex: number, muted: boolean) => {
      try {
        await fetch('http://127.0.0.1:3001/api/tracks/mute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackIndex, muted }),
        });
      } catch (error) {
        console.error('[audio:setTrackMute] Error:', error);
      }
    });

    this.ipcMain.handle('audio:saveMixerConfig', async (_event, songPath: string, config: any) => {
      try {
        await fetch('http://127.0.0.1:3001/api/mixer/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songPath, config }),
        });
      } catch (error) {
        console.error('[audio:saveMixerConfig] Error:', error);
      }
    });

    this.ipcMain.handle('audio:loadMixerConfig', async (_event, songPath: string) => {
      try {
        const response = await fetch(`http://127.0.0.1:3001/api/mixer/load?songPath=${encodeURIComponent(songPath)}`);
        return await response.json();
      } catch (error) {
        console.error('[audio:loadMixerConfig] Error:', error);
        return null;
      }
    });

    this.ipcMain.handle('audio:getMemoryUsage', async (_event) => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/health');
        const data = await response.json() as any;
        return { rss: (data as any)?.memory?.rss || 0, heapUsed: (data as any)?.memory?.heapUsed || 0, heapTotal: (data as any)?.memory?.heapTotal || 0 };
      } catch (error) {
        console.error('[audio:getMemoryUsage] Error:', error);
        return { rss: 0, heapUsed: 0, heapTotal: 0 };
      }
    });

    this.ipcMain.handle('audio:startServiceFromApp', async (_event) => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/health');
        return await response.json();
      } catch (error) {
        console.error('[audio:startServiceFromApp] Error:', error);
        return { success: false };
      }
    });

    this.ipcMain.handle('audio:cleanup', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/cleanup', { method: 'POST' });
      } catch (error) {
        console.error('[audio:cleanup] Error:', error);
      }
    });

    this.ipcMain.handle('audio:playAllTracks', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/play-all', { method: 'POST' });
      } catch (error) {
        console.error('[audio:playAllTracks] Error:', error);
      }
    });

    this.ipcMain.handle('audio:stopAllAudio', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/stop', { method: 'POST' });
      } catch (error) {
        console.error('[audio:stopAllAudio] Error:', error);
      }
    });

    this.ipcMain.handle('audio:goToBeginning', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/playback/reset', { method: 'POST' });
      } catch (error) {
        console.error('[audio:goToBeginning] Error:', error);
      }
    });

    this.ipcMain.handle('audio:clearTracks', async (_event) => {
      try {
        await fetch('http://127.0.0.1:3001/api/tracks/clear', { method: 'POST' });
      } catch (error) {
        console.error('[audio:clearTracks] Error:', error);
      }
    });

    this.ipcMain.handle('audio:addTracks', async (_event, trackPaths: string[]) => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/tracks/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackPaths }),
        });
        return await response.json();
      } catch (error) {
        console.error('[audio:addTracks] Error:', error);
        return [];
      }
    });
  }

  /**
   * Display Service handlers
   */
  private registerDisplayServiceHandlers(): void {
    this.ipcMain.handle('display:slide', async (_event, content: any) => {
      return await this.services.displayService.displaySlide(
        this.services.audienceWindow,
        this.services.confidenceWindow,
        this.services.lowerThirdsWindow,
        content
      );
    });

    this.ipcMain.handle('display:blackScreen', async () => {
      return await this.services.displayService.displayBlackScreen(this.services.audienceWindow);
    });

    this.ipcMain.handle('display:clearAll', async () => {
      // Send clear message to all display windows
      try {
        const windows = [
          this.services.audienceWindow(),
          this.services.confidenceWindow(),
          this.services.lowerThirdsWindow(),
        ];
        for (const win of windows) {
          if (win) {
            win.webContents.send('display:clear');
          }
        }
      } catch (error) {
        console.error('[display:clearAll] Error:', error);
      }
    });

    this.ipcMain.handle('display:updateLowerThirds', async (_event, textData: any) => {
      return await this.services.displayService.updateLowerThirds(this.services.lowerThirdsWindow, textData);
    });

    this.ipcMain.handle('display:broadcast', async (_event, channel: string, data: any) => {
      return await this.services.displayService.broadcastToAllDisplays(
        this.services.audienceWindow,
        this.services.confidenceWindow,
        this.services.lowerThirdsWindow,
        channel,
        data
      );
    });
  }

  /**
   * Window Service handlers
   */
  private registerWindowServiceHandlers(): void {
    this.ipcMain.handle('window:showAudience', async () => {
      return await this.services.windowService.showAudienceWindow(this.services.audienceWindow);
    });

    this.ipcMain.handle('window:hideAudience', async () => {
      return await this.services.windowService.hideAudienceWindow(this.services.audienceWindow);
    });

    this.ipcMain.handle('window:showConfidence', async () => {
      return await this.services.windowService.showConfidenceWindow(this.services.confidenceWindow);
    });

    this.ipcMain.handle('window:hideConfidence', async () => {
      return await this.services.windowService.hideConfidenceWindow(this.services.confidenceWindow);
    });

    this.ipcMain.handle('window:showLowerThirds', async () => {
      return await this.services.windowService.showLowerThirdsWindow(this.services.lowerThirdsWindow);
    });

    this.ipcMain.handle('window:hideLowerThirds', async () => {
      return await this.services.windowService.hideLowerThirdsWindow(this.services.lowerThirdsWindow);
    });

    this.ipcMain.handle('window:toggle', async (_event, windowName: string) => {
      const getWindow =
        windowName === 'audience'
          ? this.services.audienceWindow
          : windowName === 'confidence'
          ? this.services.confidenceWindow
          : this.services.lowerThirdsWindow;
      return await this.services.windowService.toggleWindow(getWindow);
    });

    this.ipcMain.handle('window:setAlwaysOnTop', async (_event, windowName: string, alwaysOnTop: boolean) => {
      const getWindow =
        windowName === 'audience'
          ? this.services.audienceWindow
          : windowName === 'confidence'
          ? this.services.confidenceWindow
          : this.services.lowerThirdsWindow;
      return await this.services.windowService.setAlwaysOnTop(getWindow, alwaysOnTop);
    });

    this.ipcMain.handle('window:getAllStatus', async () => {
      return await this.services.windowService.getAllWindowsStatus(
        this.services.audienceWindow,
        this.services.confidenceWindow,
        this.services.lowerThirdsWindow
      );
    });
  }

  /**
   * Modal window handlers
   */
  private registerModalWindowHandlers(): void {
    this.ipcMain.handle('open_preservice_music_window', async () => {
      const { BrowserWindow } = require('electron');
      const isDev = process.env.NODE_ENV === 'development';
      const VITE_DEV_SERVER_URL = 'http://localhost:5174';

      let preserviceWindow: BrowserWindow | null = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
        },
        title: 'Pre-Service Music',
        show: false,
      });

      if (isDev) {
        preserviceWindow?.loadURL(`${VITE_DEV_SERVER_URL}/preservice-music.html`);
      } else {
        preserviceWindow?.loadFile(path.join(__dirname, '../harmonysync/dist/preservice-music.html'));
      }

      preserviceWindow?.once('ready-to-show', () => {
        preserviceWindow?.show();
      });

      preserviceWindow?.on('closed', () => {
        preserviceWindow = null;
      });

      return { success: true };
    });

    this.ipcMain.handle('close_preservice_music_window', async () => {
      return { success: true };
    });

    this.ipcMain.handle('open_scheduler_window', async () => {
      console.log('[IPC] open_scheduler_window called');
      const { BrowserWindow } = require('electron');
      const isDev = process.env.NODE_ENV === 'development';
      const VITE_DEV_SERVER_URL = 'http://localhost:5174';

      console.log('[IPC] Creating scheduler window, isDev:', isDev);
      let schedulerWindow: BrowserWindow | null = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
        },
        title: 'Scheduler',
        show: false,
      });

      if (isDev) {
        console.log('[IPC] Loading dev URL:', `${VITE_DEV_SERVER_URL}/scheduler.html`);
        schedulerWindow?.loadURL(`${VITE_DEV_SERVER_URL}/scheduler.html`);
      } else {
        const filePath = path.join(__dirname, '../harmonysync/dist/scheduler.html');
        console.log('[IPC] Loading file:', filePath);
        schedulerWindow?.loadFile(filePath);
      }

      schedulerWindow?.once('ready-to-show', () => {
        console.log('[IPC] Scheduler window ready, showing');
        schedulerWindow?.show();
      });

      schedulerWindow?.on('closed', () => {
        console.log('[IPC] Scheduler window closed');
        schedulerWindow = null;
      });

      console.log('[IPC] Scheduler window created successfully');
      return { success: true };
    });
  }

  /**
   * Macro handlers
   */
  private registerMacroHandlers(): void {
    this.ipcMain.handle('macro:execute', async (_event, macroId: string, macroAction: any, options?: any) => {
      const { app } = require('electron');
      return await this.services.macroService.executeMacro(app, macroId, macroAction, options);
    });

    this.ipcMain.handle('macro:getAll', async () => {
      return await this.services.jsonStorage.getAllMacros();
    });

    this.ipcMain.handle('macro:getById', async (_event, macroId: string) => {
      return await this.services.jsonStorage.getMacroById(macroId);
    });

    this.ipcMain.handle('macro:create', async (_event, macro: any) => {
      return await this.services.jsonStorage.createMacro(macro);
    });

    this.ipcMain.handle('macro:update', async (_event, macro: any) => {
      return await this.services.jsonStorage.updateMacro(macro);
    });

    this.ipcMain.handle('macro:delete', async (_event, macroId: string) => {
      return await this.services.jsonStorage.deleteMacro(macroId);
    });

    this.ipcMain.handle('macro:getForSlide', async (_event, slideId: string) => {
      return await this.services.jsonStorage.getMacrosForSlide(slideId);
    });

    this.ipcMain.handle('macro:addToSlide', async (_event, slideId: string, macroId: string) => {
      return await this.services.jsonStorage.addMacroToSlide(slideId, macroId);
    });

    this.ipcMain.handle('macro:removeFromSlide', async (_event, slideId: string, macroId: string) => {
      return await this.services.jsonStorage.removeMacroFromSlide(slideId, macroId);
    });

    this.ipcMain.handle('macro:validate', async (_event, macro: any) => {
      return this.services.macroService.validateMacro(macro);
    });
  }

  /**
   * Scheduler Service handlers
   */
  private registerSchedulerHandlers(): void {
    this.ipcMain.handle('scheduler:getAllEvents', async () => {
      return await this.services.jsonStorage.getAllScheduledEvents();
    });

    this.ipcMain.handle('scheduler:getById', async (_event, eventId: string) => {
      return await this.services.jsonStorage.getScheduledEventById(eventId);
    });

    this.ipcMain.handle('scheduler:create', async (_event, scheduledEvent: any) => {
      return await this.services.jsonStorage.createScheduledEvent(scheduledEvent);
    });

    this.ipcMain.handle('scheduler:update', async (_event, scheduledEvent: any) => {
      return await this.services.jsonStorage.updateScheduledEvent(scheduledEvent);
    });

    this.ipcMain.handle('scheduler:delete', async (_event, eventId: string) => {
      return await this.services.jsonStorage.deleteScheduledEvent(eventId);
    });

    this.ipcMain.handle('scheduler:getTodayEvents', async () => {
      return await this.services.jsonStorage.getTodayEvents();
    });

    this.ipcMain.handle('scheduler:getUpcoming', async (_event, hours?: number) => {
      return await this.services.jsonStorage.getUpcomingEvents(hours);
    });

    this.ipcMain.handle('scheduler:validate', async (_event, scheduledEvent: any) => {
      return this.services.schedulerService.validateScheduledEvent(scheduledEvent);
    });
  }

  /**
   * Slides Service handlers
   */
  private registerSlidesHandlers(): void {
    this.ipcMain.handle('slides:loadFromFolder', async (_event, folderPath: string) => {
      try {
        // Load slides from the folder
        let slides: unknown[] = [];
        let tracks: unknown[] = [];

        // Try to load slides if slidesService is available
        if (this.services.slidesService && typeof this.services.slidesService.importFromFolder === 'function') {
          try {
            slides = await this.services.slidesService.importFromFolder(folderPath);
          } catch (error) {
            console.warn('[ipc-handlers] Failed to load slides from folder:', error);
          }
        }

        // Try to load audio tracks if audioService is available
        if (this.services.audioService && typeof this.services.audioService.loadTracks === 'function') {
          try {
            tracks = await this.services.audioService.loadTracks(folderPath);
          } catch (error) {
            console.warn('[ipc-handlers] Failed to load tracks from folder:', error);
          }
        }

        return { slides, tracks };
      } catch (error) {
        console.error('[ipc-handlers] Error in slides:loadFromFolder:', error);
        return { slides: [], tracks: [] };
      }
    });

    this.ipcMain.handle('slides:importPdf', async (_event, pdfPath: string, options?: any) => {
      return await this.services.slidesService.importPdf(pdfPath, options, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'pdf' });
      });
    });

    this.ipcMain.handle('slides:importPowerpoint', async (_event, pptxPath: string, options?: any) => {
      return await this.services.slidesService.importPowerpoint(pptxPath, options, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'powerpoint' });
      });
    });

    this.ipcMain.handle('slides:createTextSlide', async (_event, text: string, style: any, backgroundImage?: string) => {
      return await this.services.slidesService.createTextSlide(text, style, backgroundImage);
    });

    this.ipcMain.handle('slides:importFromFolder', async (_event, folderPath: string, options?: any) => {
      return await this.services.slidesService.importFromFolder(folderPath, options, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'folder' });
      });
    });

    this.ipcMain.handle('slides:validateFile', async (_event, filePath: string) => {
      return await this.services.slidesService.validateSlideFile(filePath);
    });

    this.ipcMain.handle('slides:getMetadata', async (_event, filePath: string) => {
      return await this.services.slidesService.getSlideMetadata(filePath);
    });

    this.ipcMain.handle('slides:importFromZip', async (_event, zipPath: string, options?: any) => {
      return await this.services.slidesService.importFromZip(zipPath, options, (progress: any) => {
        const win = this.services.mainWindow();
        if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'zip' });
      });
    });

    this.ipcMain.handle('slides:scanServiceFolder', async (_event, servicePath: string) => {
      return await this.services.slidesService.scanServiceFolder(servicePath);
    });
  }

  /**
   * Display and Audio Settings handlers
   */
  private registerSettingsHandlers(): void {
    this.ipcMain.handle('settings:getDisplays', async () => {
      const displays = screen.getAllDisplays();
      return displays.map((display) => ({
        id: display.id,
        name: `Display ${display.id} (${display.size.width}x${display.size.height})`,
        bounds: display.bounds,
        workArea: display.workArea,
      }));
    });

    this.ipcMain.handle('settings:getAudioDevices', async () => {
      // For now, return basic device list
      // TODO: Implement actual audio device enumeration
      return [
        { id: 'default', name: 'Default Audio Device' },
        { id: 'speakers', name: 'Speakers' },
        { id: 'headphones', name: 'Headphones' },
      ];
    });

    this.ipcMain.handle('settings:getSettingsPath', async () => {
      const { app } = require('electron');
      return path.join(app.getPath('userData'), 'settings');
    });
  }

  /**
   * Display Configuration handlers
   */
  private registerDisplayConfigHandlers(): void {
    this.ipcMain.handle('displayConfig:getAll', async () => {
      return this.services.displayConfigService.getAllDisplayConfigs();
    });

    this.ipcMain.handle('displayConfig:get', async (_event, id: string) => {
      return this.services.displayConfigService.getDisplayConfig(id);
    });

    this.ipcMain.handle('displayConfig:create', async (_event, config: any) => {
      return await this.services.displayConfigService.createDisplayConfig(config);
    });

    this.ipcMain.handle('displayConfig:update', async (_event, id: string, updates: any) => {
      return await this.services.displayConfigService.updateDisplayConfig(id, updates);
    });

    this.ipcMain.handle('displayConfig:delete', async (_event, id: string) => {
      return await this.services.displayConfigService.deleteDisplayConfig(id);
    });

    this.ipcMain.handle('displayConfig:reorder', async (_event, orderedIds: string[]) => {
      return await this.services.displayConfigService.reorderDisplayConfigs(orderedIds);
    });

    this.ipcMain.handle('displayConfig:getEnabled', async () => {
      return this.services.displayConfigService.getEnabledDisplayConfigs();
    });
  }

  /**
   * Remote Control Event Handlers
   * These handlers are called when actions occur in the main app
   * to sync state with the remote control service
   */
  private registerRemoteControlEventHandlers(): void {
    this.ipcMain.on('app:folder-loaded', (_event, data: any) => {
      this.services.remoteControlService.updateState({
        currentFolder: data.folderPath,
        currentSlideIndex: 0,
        totalSlides: data.totalSlides || 0,
        loadedTracks: data.audioTracks || [],
      });
    });

    this.ipcMain.on('app:slide-changed', (_event, data: any) => {
      this.services.remoteControlService.updateState({
        currentSlideIndex: data.slideIndex,
      });
    });

    this.ipcMain.on('app:playback-changed', (_event, data: any) => {
      this.services.remoteControlService.updateState({
        playbackStatus: data.status,
        playbackPosition: data.position || 0,
      });
    });
  }
}

/**
 * Factory function to setup IPC handlers
 * @param ipcMain - Electron IPC Main instance
 * @param services - Service instances
 */
export default function setupIpcHandlers(ipcMain: IpcMain, services: Services): void {
  const manager = new IPCHandlerManager(ipcMain, services);
  manager.registerAll();
}

// Legacy CommonJS export
module.exports = setupIpcHandlers;
