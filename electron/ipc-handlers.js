const { dialog } = require('electron');

module.exports = function setupIpcHandlers(ipcMain, services) {
  // Services contains getter functions for windows, not window instances
  const {
    mainWindow, // getter function
    audienceWindow, // getter function
    confidenceWindow, // getter function
    lowerThirdsWindow, // getter function
    database,
    ffmpegService,
    videoService,
    youtubeService,
    imageService,
    textService,
    httpServer,
    midiManager,
    lyricsFetcher,
    fileManager,
    googleDriveService
  } = services;

  // Dialog handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0];
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

  // Database handlers
  ipcMain.handle('db:query', async (event, query, params) => {
    return await database.query(query, params);
  });

  ipcMain.handle('db:run', async (event, query, params) => {
    return await database.run(query, params);
  });

  ipcMain.handle('db:get', async (event, query, params) => {
    return await database.get(query, params);
  });

  ipcMain.handle('db:all', async (event, query, params) => {
    return await database.all(query, params);
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

  ipcMain.handle('youtube:addLink', async (event, presentationId, url) => {
    return await youtubeService.addYouTubeLink(database.getConnection(), presentationId, url);
  });

  ipcMain.handle('youtube:getLinks', async (event, presentationId) => {
    return await youtubeService.getYouTubeLinks(database.getConnection(), presentationId);
  });

  ipcMain.handle('youtube:deleteLink', async (event, linkId) => {
    return await youtubeService.deleteYouTubeLink(database.getConnection(), linkId);
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

  // Window handlers
  ipcMain.handle('window:showAudience', async () => {
    const win = audienceWindow();
    if (win) win.show();
  });

  ipcMain.handle('window:hideAudience', async () => {
    const win = audienceWindow();
    if (win) win.hide();
  });

  ipcMain.handle('window:showConfidence', async () => {
    const win = confidenceWindow();
    if (win) win.show();
  });

  ipcMain.handle('window:hideConfidence', async () => {
    const win = confidenceWindow();
    if (win) win.hide();
  });

  ipcMain.handle('window:showLowerThirds', async () => {
    const win = lowerThirdsWindow();
    if (win) win.show();
  });

  ipcMain.handle('window:hideLowerThirds', async () => {
    const win = lowerThirdsWindow();
    if (win) win.hide();
  });

  // Display handlers
  ipcMain.handle('display:videoSlide', async (event, path, duration) => {
    const audWin = audienceWindow();
    const confWin = confidenceWindow();
    
    if (audWin) {
      audWin.webContents.send('display-video-slide', path);
    }
    if (confWin) {
      confWin.webContents.send('start-video-countdown', duration);
    }
  });

  ipcMain.handle('display:slide', async (event, content) => {
    const audWin = audienceWindow();
    const confWin = confidenceWindow();
    const lowerWin = lowerThirdsWindow();
    
    if (audWin) {
      audWin.webContents.send('display-slide', content);
    }
    if (confWin) {
      confWin.webContents.send('display-slide', content);
    }
    if (lowerWin && content.lowerThirds) {
      lowerWin.webContents.send('update-lower-thirds', content.lowerThirds);
    }
  });

  ipcMain.handle('display:blackScreen', async () => {
    const audWin = audienceWindow();
    if (audWin) {
      audWin.webContents.send('display-black-screen');
    }
  });

  // MIDI handlers
  ipcMain.handle('midi:getDevices', async () => {
    return await midiManager.getDevices();
  });

  ipcMain.handle('midi:sendNote', async (event, device, note, velocity, duration) => {
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
};
