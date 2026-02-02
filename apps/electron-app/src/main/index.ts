// Electron main entry (scaffold)
import { app, BrowserWindow } from 'electron';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: undefined as unknown as string // wire up preload path in your build
    }
  });

  mainWindow.loadURL('http://localhost:5174');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
