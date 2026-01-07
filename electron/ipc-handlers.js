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
    return await ffmpegService.getVideoMetadata(path);
  });

  ipcMain.handle('ffmpeg:transcodeVideo', async (event, inputPath) => {
    return await ffmpegService.transcodeVideo(inputPath, (progress) => {
      const win = mainWindow();
      if (win) win.webContents.send('video-transcode-progress', progress);
    });
  });

  ipcMain.handle('ffmpeg:generateThumbnail', async (event, videoPath) => {
    return await ffmpegService.generateThumbnail(videoPath);
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

  // CSS generation
  ipcMain.handle('css:generateBackground', async (event, path) => {
    return await fileManager.generateBackgroundCss(path);
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
