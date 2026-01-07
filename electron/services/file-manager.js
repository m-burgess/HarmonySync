const fs = require('fs-extra');
const path = require('path');

// Read file
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// Write file
async function writeFile(filePath, content) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

// Read directory
async function readDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(dirPath, file.name)
    }));
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
}

// Check if file/directory exists
async function exists(filePath) {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    return false;
  }
}

// Create directory
async function mkdir(dirPath) {
  try {
    await fs.ensureDir(dirPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to create directory: ${error.message}`);
  }
}

// Copy file
async function copyFile(src, dest) {
  try {
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(src, dest);
    return true;
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}

// Generate background CSS
async function generateBackgroundCss(dirPath) {
  const cssPath = path.join(dirPath, 'background.css');
  
  // Check if it already exists
  if (await fs.pathExists(cssPath)) {
    return await fs.readFile(cssPath, 'utf8');
  }
  
  // Generate random gradient
  const r1 = Math.floor(Math.random() * 156) + 100;
  const g1 = Math.floor(Math.random() * 156) + 100;
  const b1 = Math.floor(Math.random() * 156) + 100;
  
  const r2 = Math.floor(Math.random() * 156) + 100;
  const g2 = Math.floor(Math.random() * 156) + 100;
  const b2 = Math.floor(Math.random() * 156) + 100;
  
  const r3 = Math.floor(Math.random() * 156) + 100;
  const g3 = Math.floor(Math.random() * 156) + 100;
  const b3 = Math.floor(Math.random() * 156) + 100;
  
  const css = `body {
    background: linear-gradient(-45deg, rgb(${r1}, ${g1}, ${b1}), rgb(${r2}, ${g2}, ${b2}), rgb(${r3}, ${g3}, ${b3}));
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
  
  await fs.ensureDir(path.dirname(cssPath));
  await fs.writeFile(cssPath, css);
  
  return css;
}

module.exports = {
  readFile,
  writeFile,
  readDir,
  exists,
  mkdir,
  copyFile,
  generateBackgroundCss
};
