const { dialog } = require('electron');

module.exports = function setupIpcHandlers(ipcMain, services) {
  // Services contains getter functions for windows, not window instances
  const {
    mainWindow, // getter function
    audienceWindow, // getter function
    confidenceWindow, // getter function
    lowerThirdsWindow, // getter function
    jsonStorage,
    ffmpegService,
    audioService,
    videoService,
    youtubeService,
    imageService,
    textService,
    displayService,
    windowService,
    macroService,
    schedulerService,
    httpServer,
    midiManager,
    lyricsFetcher,
    fileManager,
    googleDriveService,
    dropboxService,
    scriptService,
    scriptingAPI
  } = services;

  // Dialog handlers
  ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
    const properties = ['openDirectory'];
    if (options.multiple) properties.push('multiSelections');
    console.log('[ipc-handlers] dialog:openDirectory called with properties', properties);

    const win = typeof mainWindow === 'function' ? mainWindow() : null;
    const result = await dialog.showOpenDialog(win || undefined, { properties });
    console.log('[ipc-handlers] dialog:openDirectory result', result.filePaths);
    return result.filePaths || [];
  });

  ipcMain.handle('dialog:openFile', async (event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || []
    });
    return result.filePaths[0];
  });

  // File system handlers
  ipcMain.handle('fs:readFile', async (event, path) => {
    return await fileManager.readFile(path);
  });

  ipcMain.handle('fs:writeFile', async (event, path, content) => {
    return await fileManager.writeFile(path, content);
  });

  ipcMain.handle('fs:readDir', async (event, path) => {
    return await fileManager.readDir(path);
  });

  ipcMain.handle('fs:exists', async (event, path) => {
    return await fileManager.exists(path);
  });

  ipcMain.handle('fs:mkdir', async (event, path) => {
    return await fileManager.mkdir(path);
  });

  ipcMain.handle('fs:copyFile', async (event, src, dest) => {
    return await fileManager.copyFile(src, dest);
  });

  // JSON Storage handlers (legacy compatibility - these methods log warnings and should be refactored)
  ipcMain.handle('db:query', async (event, query, params) => {
    return await jsonStorage.query(query, params);
  });

  ipcMain.handle('db:run', async (event, query, params) => {
    return await jsonStorage.run(query, params);
  });

  ipcMain.handle('db:get', async (event, query, params) => {
    return await jsonStorage.get(query, params);
  });

  ipcMain.handle('db:all', async (event, query, params) => {
    return await jsonStorage.all(query, params);
  });

  // FFmpeg handlers
  ipcMain.handle('ffmpeg:convertToOgg', async (event, inputPath, outputDir) => {
    return await ffmpegService.convertToOgg(inputPath, outputDir, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('ogg-conversion-progress', progress);
    });
  });

  ipcMain.handle('ffmpeg:transposeAudio', async (event, songPath, semitones) => {
    return await ffmpegService.transposeAudio(songPath, semitones, (tracks) => {
      const win = mainWindow();
      if (win) win.webContents.send('tracks-updated', tracks);
    });
  });

  ipcMain.handle('ffmpeg:getVideoMetadata', async (event, path) => {
    return await videoService.getVideoMetadata(path);
  });

  ipcMain.handle('ffmpeg:transcodeVideo', async (event, inputPath) => {
    return await videoService.transcodeVideo(inputPath, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('video-transcode-progress', progress);
    });
  });

  ipcMain.handle('ffmpeg:generateThumbnail', async (event, videoPath) => {
    return await videoService.generateThumbnail(videoPath);
  });

  // Video Service handlers
  ipcMain.handle('video:getMetadata', async (event, path) => {
    return await videoService.getVideoMetadata(path);
  });

  ipcMain.handle('video:transcode', async (event, inputPath) => {
    return await videoService.transcodeVideo(inputPath, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('video-transcode-progress', progress);
    });
  });

  ipcMain.handle('video:generateThumbnail', async (event, videoPath, timestamp, size) => {
    return await videoService.generateThumbnail(videoPath, timestamp, size);
  });

  ipcMain.handle('video:getDuration', async (event, videoPath) => {
    return await videoService.getVideoDuration(videoPath);
  });

  ipcMain.handle('video:needsTranscoding', async (event, videoPath) => {
    return await videoService.needsTranscoding(videoPath);
  });

  ipcMain.handle('video:optimizeForStreaming', async (event, inputPath) => {
    return await videoService.optimizeForStreaming(inputPath);
  });

  ipcMain.handle('video:extractFrames', async (event, videoPath, intervalSeconds) => {
    return await videoService.extractFrames(videoPath, intervalSeconds);
  });

  // YouTube Service handlers
  ipcMain.handle('youtube:transcodeForUpload', async (event, inputPath) => {
    return await youtubeService.transcodeForYouTube(inputPath, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('youtube-transcode-progress', progress);
    });
  });

  ipcMain.handle('youtube:validate', async (event, videoPath) => {
    return await youtubeService.validateForYouTube(videoPath);
  });

  ipcMain.handle('youtube:addLink', async (event, presentationPath, url) => {
    return await jsonStorage.addYouTubeLink(presentationPath, url);
  });

  ipcMain.handle('youtube:getLinks', async (event, presentationPath) => {
    return await jsonStorage.getYouTubeLinks(presentationPath);
  });

  ipcMain.handle('youtube:deleteLink', async (event, presentationPath, url) => {
    return await jsonStorage.deleteYouTubeLink(presentationPath, url);
  });

  ipcMain.handle('youtube:extractId', async (event, url) => {
    return youtubeService.extractYouTubeId(url);
  });

  ipcMain.handle('youtube:getThumbnailUrl', async (event, videoIdOrUrl, quality) => {
    return youtubeService.getYouTubeThumbnailUrl(videoIdOrUrl, quality);
  });

  ipcMain.handle('youtube:isValidUrl', async (event, url) => {
    return youtubeService.isValidYouTubeUrl(url);
  });

  ipcMain.handle('youtube:generateEmbedUrl', async (event, videoIdOrUrl, options) => {
    return youtubeService.generateEmbedUrl(videoIdOrUrl, options);
  });

  // Image Service handlers
  ipcMain.handle('image:getMetadata', async (event, imagePath) => {
    return await imageService.getImageMetadata(imagePath);
  });

  ipcMain.handle('image:generateThumbnail', async (event, imagePath, width, height) => {
    return await imageService.generateThumbnail(imagePath, width, height);
  });

  ipcMain.handle('image:convertFormat', async (event, inputPath, format, options) => {
    return await imageService.convertFormat(inputPath, format, options);
  });

  ipcMain.handle('image:resize', async (event, imagePath, width, height, options) => {
    return await imageService.resizeImage(imagePath, width, height, options);
  });

  ipcMain.handle('image:optimizeForWeb', async (event, imagePath) => {
    return await imageService.optimizeForWeb(imagePath);
  });

  ipcMain.handle('image:addTextOverlay', async (event, imagePath, text, options) => {
    return await imageService.addTextOverlay(imagePath, text, options);
  });

  ipcMain.handle('image:loadAndCache', async (event, imagePath) => {
    return await imageService.loadAndCache(imagePath);
  });

  ipcMain.handle('image:clearCache', async (event, olderThanDays) => {
    return await imageService.clearCache(olderThanDays);
  });

  ipcMain.handle('image:getDominantColor', async (event, imagePath) => {
    return await imageService.getDominantColor(imagePath);
  });

  ipcMain.handle('image:isSupportedFormat', async (event, filePath) => {
    return imageService.isSupportedImage(filePath);
  });

  // Text Service handlers
  ipcMain.handle('text:generateBackgroundCSS', async (event, options) => {
    return textService.generateBackgroundCSS(options);
  });

  ipcMain.handle('text:generateAndSaveCSS', async (event, dirPath, options) => {
    return await textService.generateAndSaveCSS(dirPath, options);
  });

  ipcMain.handle('text:formatLyrics', async (event, lyrics) => {
    return textService.formatLyrics(lyrics);
  });

  ipcMain.handle('text:splitLyricsIntoSlides', async (event, lyrics, linesPerSlide) => {
    return textService.splitLyricsIntoSlides(lyrics, linesPerSlide);
  });

  ipcMain.handle('text:generateSlideHTML', async (event, text, style) => {
    return textService.generateSlideHTML(text, style);
  });

  ipcMain.handle('text:extractTextFromFile', async (event, filePath) => {
    return await textService.extractTextFromFile(filePath);
  });

  ipcMain.handle('text:wordWrap', async (event, text, maxWidth) => {
    return textService.wordWrap(text, maxWidth);
  });

  ipcMain.handle('text:generateTextCSS', async (event, style) => {
    return textService.generateTextCSS(style);
  });

  ipcMain.handle('text:getTextStats', async (event, text) => {
    return textService.getTextStats(text);
  });

  // Window handlers - moved to line ~610 with windowService
  // Display handlers - moved to line ~587 with displayService

  // MIDI handlers
  ipcMain.handle('midi:getDevices', async () => {
    if (!midiManager) {
      return [];
    }
    return await midiManager.getDevices();
  });

  ipcMain.handle('midi:sendNote', async (event, device, note, velocity, duration) => {
    if (!midiManager) {
      return false;
    }
    return await midiManager.sendNote(device, note, velocity, duration);
  });

  // Lyrics handlers
  ipcMain.handle('lyrics:search', async (event, title, artist) => {
    return await lyricsFetcher.search(title, artist);
  });

  ipcMain.handle('lyrics:fetch', async (event, songId) => {
    return await lyricsFetcher.fetch(songId);
  });

  // Google Drive handlers
  ipcMain.handle('gdrive:auth', async () => {
    return await googleDriveService.authenticate();
  });

  ipcMain.handle('gdrive:listFiles', async (event, folderId) => {
    return await googleDriveService.listFiles(folderId);
  });

  ipcMain.handle('gdrive:downloadFile', async (event, fileId, destination) => {
    return await googleDriveService.downloadFile(fileId, destination);
  });

  ipcMain.handle('gdrive:syncFolder', async (event, folderId, localPath) => {
    return await googleDriveService.syncFolder(folderId, localPath);
  });

  // Dropbox handlers
  ipcMain.handle('dropbox:auth', async () => {
    return await dropboxService.authenticate();
  });

  ipcMain.handle('dropbox:listFiles', async (event, path) => {
    return await dropboxService.listFiles(path);
  });

  ipcMain.handle('dropbox:downloadFile', async (event, path, destination) => {
    return await dropboxService.downloadFile(path, destination);
  });

  ipcMain.handle('dropbox:syncFolder', async (event, dropboxPath, localPath) => {
    return await dropboxService.syncFolder(dropboxPath, localPath);
  });

  // Script handlers
  ipcMain.handle('script:getAll', async () => {
    return await scriptService.getAllScripts();
  });

  ipcMain.handle('script:get', async (event, scriptId) => {
    return await scriptService.getScript(scriptId);
  });

  ipcMain.handle('script:create', async (event, scriptData) => {
    return await scriptService.createScript(scriptData);
  });

  ipcMain.handle('script:update', async (event, scriptId, updates) => {
    return await scriptService.updateScript(scriptId, updates);
  });

  ipcMain.handle('script:delete', async (event, scriptId) => {
    return await scriptService.deleteScript(scriptId);
  });

  ipcMain.handle('script:validate', async (event, code) => {
    return scriptService.validateScript(code);
  });

  ipcMain.handle('script:execute', async (event, scriptId, options) => {
    const harmonyAPI = scriptingAPI.createHarmonySyncAPI(services);
    return await scriptService.executeScript(scriptId, harmonyAPI, options);
  });

  ipcMain.handle('script:export', async (event, scriptId, exportPath) => {
    return await scriptService.exportScript(scriptId, exportPath);
  });

  ipcMain.handle('script:import', async (event, importPath) => {
    return await scriptService.importScript(importPath);
  });

  // Event Trigger handlers
  const eventTriggerService = require('./services/event-trigger-service');

  ipcMain.handle('trigger:register', async (event, eventType, scriptId, options) => {
    return await eventTriggerService.registerTrigger(eventType, scriptId, options);
  });

  ipcMain.handle('trigger:unregister', async (event, triggerId) => {
    return await eventTriggerService.unregisterTrigger(triggerId);
  });

  ipcMain.handle('trigger:getAll', async () => {
    return await eventTriggerService.getAllTriggers();
  });

  ipcMain.handle('trigger:enable', async (event, triggerId) => {
    return await eventTriggerService.enableTrigger(triggerId);
  });

  ipcMain.handle('trigger:disable', async (event, triggerId) => {
    return await eventTriggerService.disableTrigger(triggerId);
  });

  ipcMain.handle('trigger:test', async (event, triggerId, testData) => {
    return await eventTriggerService.testTrigger(triggerId, testData);
  });

  ipcMain.handle('event:list', async () => {
    return eventTriggerService.getEventTypes();
  });

  ipcMain.handle('event:emit', async (event, eventType, eventData) => {
    return await eventTriggerService.emitEvent(eventType, eventData);
  });

  // Script Template handlers
  const fs = require('fs-extra');
  const path = require('path');

  ipcMain.handle('template:getAll', async () => {
    const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
    try {
      const files = await fs.readdir(templatesDir);
      const templates = files.filter(f => f.endsWith('.js'));
      
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
          filename: file
        });
      }
      
      return templateList;
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  });

  ipcMain.handle('template:get', async (event, templateId) => {
    const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
    const templatePath = path.join(templatesDir, `${templateId}.js`);
    
    if (await fs.pathExists(templatePath)) {
      return await fs.readFile(templatePath, 'utf8');
    } else {
      throw new Error(`Template not found: ${templateId}`);
    }
  });

  ipcMain.handle('template:load', async (event, templateId) => {
    const templatesDir = path.join(__dirname, '../harmonysync/script-templates');
    const templatePath = path.join(templatesDir, `${templateId}.js`);
    
    if (await fs.pathExists(templatePath)) {
      const content = await fs.readFile(templatePath, 'utf8');
      return {
        id: templateId,
        code: content
      };
    } else {
      throw new Error(`Template not found: ${templateId}`);
    }
  });

  // HTTP Server handlers
  ipcMain.handle('http:getServerUrl', async () => {
    return httpServer.getUrl();
  });

  // CSS generation (legacy support)
  ipcMain.handle('css:generateBackground', async (event, path) => {
    return await textService.generateAndSaveCSS(path);
  });

  // Send to specific windows
  ipcMain.handle('send:audience', async (event, channel, data) => {
    const win = audienceWindow();
    if (win) {
      win.webContents.send(channel, data);
    }
  });

  ipcMain.handle('send:confidence', async (event, channel, data) => {
    const win = confidenceWindow();
    if (win) {
      win.webContents.send(channel, data);
    }
  });

  ipcMain.handle('send:lowerThirds', async (event, channel, data) => {
    const win = lowerThirdsWindow();
    if (win) {
      win.webContents.send(channel, data);
    }
  });

  // Audio Service handlers
  ipcMain.handle('audio:convertToOgg', async (event, inputPath, outputDir) => {
    return await audioService.convertToOgg(inputPath, outputDir, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('ogg-conversion-progress', progress);
    });
  });

  ipcMain.handle('audio:transposeAudio', async (event, songPath, semitones) => {
    return await audioService.transposeAudio(songPath, semitones, (tracks) => {
      const win = mainWindow();
      if (win) win.webContents.send('tracks-updated', tracks);
    });
  });

  ipcMain.handle('audio:ensureSync', async (event, audioFiles) => {
    return await audioService.ensureAudioSync(audioFiles);
  });

  ipcMain.handle('audio:getMetadata', async (event, audioPath) => {
    return await audioService.getAudioMetadata(audioPath);
  });

  ipcMain.handle('audio:normalize', async (event, inputPath, targetLevel) => {
    return await audioService.normalizeAudio(inputPath, targetLevel);
  });

  // Display Service handlers
  // Removed duplicate: ipcMain.handle('display:videoSlide') - already defined at line 301

  ipcMain.handle('display:slide', async (event, content) => {
    return await displayService.displaySlide(audienceWindow, confidenceWindow, lowerThirdsWindow, content);
  });

  ipcMain.handle('display:blackScreen', async () => {
    return await displayService.displayBlackScreen(audienceWindow);
  });

  ipcMain.handle('display:clearAll', async () => {
    return await displayService.clearAllDisplays(audienceWindow, confidenceWindow, lowerThirdsWindow);
  });

  ipcMain.handle('display:updateLowerThirds', async (event, textData) => {
    return await displayService.updateLowerThirds(lowerThirdsWindow, textData);
  });

  ipcMain.handle('display:broadcast', async (event, channel, data) => {
    return await displayService.broadcastToAllDisplays(audienceWindow, confidenceWindow, lowerThirdsWindow, channel, data);
  });

  // Window Service handlers
  ipcMain.handle('window:showAudience', async () => {
    return await windowService.showAudienceWindow(audienceWindow);
  });

  ipcMain.handle('window:hideAudience', async () => {
    return await windowService.hideAudienceWindow(audienceWindow);
  });

  ipcMain.handle('window:showConfidence', async () => {
    return await windowService.showConfidenceWindow(confidenceWindow);
  });

  ipcMain.handle('window:hideConfidence', async () => {
    return await windowService.hideConfidenceWindow(confidenceWindow);
  });

  ipcMain.handle('window:showLowerThirds', async () => {
    return await windowService.showLowerThirdsWindow(lowerThirdsWindow);
  });

  ipcMain.handle('window:hideLowerThirds', async () => {
    return await windowService.hideLowerThirdsWindow(lowerThirdsWindow);
  });

  ipcMain.handle('window:toggle', async (event, windowName) => {
    const getWindow = windowName === 'audience' ? audienceWindow : 
                      windowName === 'confidence' ? confidenceWindow :
                      lowerThirdsWindow;
    return await windowService.toggleWindow(getWindow);
  });

  ipcMain.handle('window:setAlwaysOnTop', async (event, windowName, alwaysOnTop) => {
    const getWindow = windowName === 'audience' ? audienceWindow : 
                      windowName === 'confidence' ? confidenceWindow :
                      lowerThirdsWindow;
    return await windowService.setAlwaysOnTop(getWindow, alwaysOnTop);
  });

  ipcMain.handle('window:getAllStatus', async () => {
    return await windowService.getAllWindowsStatus(audienceWindow, confidenceWindow, lowerThirdsWindow);
  });

  // Macro Service handlers
  ipcMain.handle('macro:execute', async (event, macroId, macroAction, options) => {
    const appHandle = require('electron').app;
    return await macroService.executeMacro(appHandle, macroId, macroAction, options);
  });

  ipcMain.handle('macro:getAll', async () => {
    return await jsonStorage.getAllMacros();
  });

  ipcMain.handle('macro:getById', async (event, macroId) => {
    return await jsonStorage.getMacroById(macroId);
  });

  ipcMain.handle('macro:create', async (event, macro) => {
    return await jsonStorage.createMacro(macro);
  });

  ipcMain.handle('macro:update', async (event, macro) => {
    return await jsonStorage.updateMacro(macro);
  });

  ipcMain.handle('macro:delete', async (event, macroId) => {
    return await jsonStorage.deleteMacro(macroId);
  });

  ipcMain.handle('macro:getForSlide', async (event, slideId) => {
    return await jsonStorage.getMacrosForSlide(slideId);
  });

  ipcMain.handle('macro:addToSlide', async (event, slideId, macroId) => {
    return await jsonStorage.addMacroToSlide(slideId, macroId);
  });

  ipcMain.handle('macro:removeFromSlide', async (event, slideId, macroId) => {
    return await jsonStorage.removeMacroFromSlide(slideId, macroId);
  });

  ipcMain.handle('macro:validate', async (event, macro) => {
    return macroService.validateMacro(macro);
  });

  // Scheduler Service handlers
  ipcMain.handle('scheduler:getAllEvents', async () => {
    return await jsonStorage.getAllScheduledEvents();
  });

  ipcMain.handle('scheduler:getById', async (event, eventId) => {
    return await jsonStorage.getScheduledEventById(eventId);
  });

  ipcMain.handle('scheduler:create', async (event, scheduledEvent) => {
    return await jsonStorage.createScheduledEvent(scheduledEvent);
  });

  ipcMain.handle('scheduler:update', async (event, scheduledEvent) => {
    return await jsonStorage.updateScheduledEvent(scheduledEvent);
  });

  ipcMain.handle('scheduler:delete', async (event, eventId) => {
    return await jsonStorage.deleteScheduledEvent(eventId);
  });

  ipcMain.handle('scheduler:getTodayEvents', async () => {
    return await jsonStorage.getTodayEvents();
  });

  ipcMain.handle('scheduler:getUpcoming', async (event, hours) => {
    return await jsonStorage.getUpcomingEvents(hours);
  });

  ipcMain.handle('scheduler:validate', async (event, scheduledEvent) => {
    return schedulerService.validateScheduledEvent(scheduledEvent);
  });

  // Slides Service handlers
  ipcMain.handle('slides:importPdf', async (event, pdfPath, options) => {
    return await services.slidesService.importPdf(pdfPath, options, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'pdf' });
    });
  });

  ipcMain.handle('slides:importPowerpoint', async (event, pptxPath, options) => {
    return await services.slidesService.importPowerpoint(pptxPath, options, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'powerpoint' });
    });
  });

  ipcMain.handle('slides:createTextSlide', async (event, text, style, backgroundImage) => {
    return await services.slidesService.createTextSlide(text, style, backgroundImage);
  });

  ipcMain.handle('slides:importFromFolder', async (event, folderPath, options) => {
    return await services.slidesService.importFromFolder(folderPath, options, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'folder' });
    });
  });

  ipcMain.handle('slides:validateFile', async (event, filePath) => {
    return await services.slidesService.validateSlideFile(filePath);
  });

  ipcMain.handle('slides:getMetadata', async (event, filePath) => {
    return await services.slidesService.getSlideMetadata(filePath);
  });

  ipcMain.handle('slides:importFromZip', async (event, zipPath, options) => {
    return await services.slidesService.importFromZip(zipPath, options, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('slides-import-progress', { ...progress, type: 'zip' });
    });
  });

  ipcMain.handle('slides:scanServiceFolder', async (event, servicePath) => {
    return await services.slidesService.scanServiceFolder(servicePath);
  });
};
