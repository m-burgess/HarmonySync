const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * File Manager Module
 * Handles file system operations
 */

/**
 * Generate animated background CSS for a song folder
 * @param {string} folderPath - Path to the song folder
 * @returns {Promise<string>} Path to generated CSS file
 */
async function generateBackgroundCSS(folderPath) {
  try {
    const cssPath = path.join(folderPath, 'background.css');
    
    // Check if CSS already exists
    if (await fs.pathExists(cssPath)) {
      return cssPath;
    }

    // Generate random gradient colors
    const randomColor = () => {
      const r = Math.floor(Math.random() * 156) + 100;
      const g = Math.floor(Math.random() * 156) + 100;
      const b = Math.floor(Math.random() * 156) + 100;
      return `rgb(${r}, ${g}, ${b})`;
    };

    const color1 = randomColor();
    const color2 = randomColor();
    const color3 = randomColor();

    const cssContent = `body {
    background: linear-gradient(-45deg, ${color1}, ${color2}, ${color3});
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
}

@keyframes gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}`;

    await fs.writeFile(cssPath, cssContent);
    return cssPath;
  } catch (error) {
    console.error('Error generating background CSS:', error);
    throw error;
  }
}

/**
 * Open lyrics file in default text editor
 * @param {string} filePath - Path to the lyrics file
 * @returns {Promise<void>}
 */
async function openLyricsFile(filePath) {
  try {
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = 'notepad';
    } else if (platform === 'darwin') {
      command = 'open';
    } else {
      // Linux
      command = 'xdg-open';
    }
    
    const child = spawn(command, [filePath], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
    
    return { success: true };
  } catch (error) {
    console.error('Error opening lyrics file:', error);
    throw error;
  }
}

module.exports = {
  generateBackgroundCSS,
  openLyricsFile
};
