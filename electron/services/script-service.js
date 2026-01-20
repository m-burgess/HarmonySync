/**
 * Script Service
 * Handles user-created JavaScript scripts for custom automation and macros
 */

const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const { VM } = require('vm2');

// Script storage directory
const SCRIPTS_DIR = path.join(app.getPath('userData'), 'scripts');

/**
 * Initialize script storage directory
 */
async function initializeScriptStorage() {
  await fs.ensureDir(SCRIPTS_DIR);
  console.log(`Script storage initialized at: ${SCRIPTS_DIR}`);
}

/**
 * Get all scripts
 * @returns {Promise<Array>} Array of script objects
 */
async function getAllScripts() {
  await fs.ensureDir(SCRIPTS_DIR);
  
  const files = await fs.readdir(SCRIPTS_DIR);
  const scriptFiles = files.filter(f => f.endsWith('.js'));
  
  const scripts = [];
  for (const file of scriptFiles) {
    const scriptPath = path.join(SCRIPTS_DIR, file);
    const content = await fs.readFile(scriptPath, 'utf8');
    const stats = await fs.stat(scriptPath);
    
    // Extract metadata from script comments if present
    const metadata = extractMetadata(content);
    
    scripts.push({
      id: path.basename(file, '.js'),
      name: metadata.name || path.basename(file, '.js'),
      description: metadata.description || '',
      author: metadata.author || 'Unknown',
      version: metadata.version || '1.0.0',
      code: content,
      filePath: scriptPath,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      enabled: metadata.enabled !== false
    });
  }
  
  return scripts;
}

/**
 * Get a single script by ID
 * @param {string} scriptId - Script ID
 * @returns {Promise<Object>} Script object
 */
async function getScript(scriptId) {
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptId}.js`);
  
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  
  const content = await fs.readFile(scriptPath, 'utf8');
  const stats = await fs.stat(scriptPath);
  const metadata = extractMetadata(content);
  
  return {
    id: scriptId,
    name: metadata.name || scriptId,
    description: metadata.description || '',
    author: metadata.author || 'Unknown',
    version: metadata.version || '1.0.0',
    code: content,
    filePath: scriptPath,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    enabled: metadata.enabled !== false
  };
}

/**
 * Create a new script
 * @param {Object} scriptData - Script data
 * @returns {Promise<Object>} Created script object
 */
async function createScript(scriptData) {
  const { name, description, author, code } = scriptData;
  
  if (!name || !code) {
    throw new Error('Script name and code are required');
  }
  
  // Generate ID from name
  const scriptId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptId}.js`);
  
  // Check if script already exists
  if (await fs.pathExists(scriptPath)) {
    throw new Error(`Script with ID "${scriptId}" already exists`);
  }
  
  // Add metadata header to script
  const scriptContent = `/**
 * @name ${name}
 * @description ${description || 'No description'}
 * @author ${author || 'Unknown'}
 * @version 1.0.0
 * @enabled true
 */

${code}`;
  
  await fs.writeFile(scriptPath, scriptContent, 'utf8');
  
  return await getScript(scriptId);
}

/**
 * Update an existing script
 * @param {string} scriptId - Script ID
 * @param {Object} updates - Script updates
 * @returns {Promise<Object>} Updated script object
 */
async function updateScript(scriptId, updates) {
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptId}.js`);
  
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  
  const currentScript = await getScript(scriptId);
  
  // Merge updates
  const updatedMetadata = {
    name: updates.name || currentScript.name,
    description: updates.description || currentScript.description,
    author: updates.author || currentScript.author,
    version: updates.version || currentScript.version,
    enabled: updates.enabled !== undefined ? updates.enabled : currentScript.enabled
  };
  
  const updatedCode = updates.code || currentScript.code;
  
  // Recreate script with updated metadata
  const scriptContent = `/**
 * @name ${updatedMetadata.name}
 * @description ${updatedMetadata.description}
 * @author ${updatedMetadata.author}
 * @version ${updatedMetadata.version}
 * @enabled ${updatedMetadata.enabled}
 */

${updatedCode}`;
  
  await fs.writeFile(scriptPath, scriptContent, 'utf8');
  
  return await getScript(scriptId);
}

/**
 * Delete a script
 * @param {string} scriptId - Script ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteScript(scriptId) {
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptId}.js`);
  
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  
  await fs.remove(scriptPath);
  return true;
}

/**
 * Validate script syntax
 * @param {string} code - Script code
 * @returns {Object} Validation result
 */
function validateScript(code) {
  try {
    // Basic syntax check using Function constructor
    new Function(code);
    
    return {
      valid: true,
      errors: []
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        message: error.message,
        line: error.lineNumber || 0,
        column: error.columnNumber || 0
      }]
    };
  }
}

/**
 * Execute a script in a sandboxed environment
 * @param {string} scriptId - Script ID or code
 * @param {Object} harmonyAPI - HarmonySync API object
 * @param {Object} options - Execution options
 * @returns {Promise<any>} Script execution result
 */
async function executeScript(scriptId, harmonyAPI, options = {}) {
  const timeout = options.timeout || 10000; // 10 seconds default
  const debugMode = options.debug || false;
  
  let code;
  if (scriptId.includes('\n') || scriptId.includes('{')) {
    // Direct code execution
    code = scriptId;
  } else {
    // Load script from file
    const script = await getScript(scriptId);
    
    if (!script.enabled) {
      throw new Error(`Script "${scriptId}" is disabled`);
    }
    
    code = script.code;
  }
  
  // Validate before execution
  const validation = validateScript(code);
  if (!validation.valid) {
    throw new Error(`Script validation failed: ${validation.errors[0].message}`);
  }
  
  // Console output capture for debug mode
  const consoleOutput = [];
  
  // Create sandboxed VM
  const vm = new VM({
    timeout: timeout,
    sandbox: {
      harmony: harmonyAPI,
      console: {
        log: (...args) => {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          console.log('[Script]', ...args);
          if (debugMode) {
            consoleOutput.push({ type: 'log', message, timestamp: Date.now() });
          }
        },
        error: (...args) => {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          console.error('[Script]', ...args);
          if (debugMode) {
            consoleOutput.push({ type: 'error', message, timestamp: Date.now() });
          }
        },
        warn: (...args) => {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          console.warn('[Script]', ...args);
          if (debugMode) {
            consoleOutput.push({ type: 'warn', message, timestamp: Date.now() });
          }
        }
      }
    }
  });
  
  const startTime = Date.now();
  
  try {
    const result = await vm.run(code);
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      result: result,
      error: null,
      executionTime: executionTime,
      consoleOutput: debugMode ? consoleOutput : undefined
    };
  } catch (error) {
    console.error('Script execution error:', error);
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      result: null,
      error: {
        message: error.message,
        stack: error.stack
      },
      executionTime: executionTime,
      consoleOutput: debugMode ? consoleOutput : undefined
    };
  }
}

/**
 * Export a script to a file
 * @param {string} scriptId - Script ID
 * @param {string} exportPath - Export file path
 * @returns {Promise<string>} Exported file path
 */
async function exportScript(scriptId, exportPath) {
  const script = await getScript(scriptId);
  
  const destinationPath = exportPath.endsWith('.js') 
    ? exportPath 
    : path.join(exportPath, `${scriptId}.js`);
  
  await fs.copy(script.filePath, destinationPath);
  
  return destinationPath;
}

/**
 * Import a script from a file
 * @param {string} importPath - Import file path
 * @returns {Promise<Object>} Imported script object
 */
async function importScript(importPath) {
  if (!await fs.pathExists(importPath)) {
    throw new Error(`Import file not found: ${importPath}`);
  }
  
  const code = await fs.readFile(importPath, 'utf8');
  const metadata = extractMetadata(code);
  
  const scriptData = {
    name: metadata.name || path.basename(importPath, '.js'),
    description: metadata.description || '',
    author: metadata.author || 'Unknown',
    code: code
  };
  
  return await createScript(scriptData);
}

/**
 * Extract metadata from script comments
 * @param {string} code - Script code
 * @returns {Object} Metadata object
 */
function extractMetadata(code) {
  const metadata = {
    name: null,
    description: null,
    author: null,
    version: null,
    enabled: true
  };
  
  // Match JSDoc-style comments
  const commentMatch = code.match(/\/\*\*[\s\S]*?\*\//);
  if (!commentMatch) return metadata;
  
  const comment = commentMatch[0];
  
  // Extract fields
  const nameMatch = comment.match(/@name\s+(.+)/);
  if (nameMatch) metadata.name = nameMatch[1].trim();
  
  const descMatch = comment.match(/@description\s+(.+)/);
  if (descMatch) metadata.description = descMatch[1].trim();
  
  const authorMatch = comment.match(/@author\s+(.+)/);
  if (authorMatch) metadata.author = authorMatch[1].trim();
  
  const versionMatch = comment.match(/@version\s+(.+)/);
  if (versionMatch) metadata.version = versionMatch[1].trim();
  
  const enabledMatch = comment.match(/@enabled\s+(.+)/);
  if (enabledMatch) metadata.enabled = enabledMatch[1].trim() === 'true';
  
  return metadata;
}

module.exports = {
  initializeScriptStorage,
  getAllScripts,
  getScript,
  createScript,
  updateScript,
  deleteScript,
  validateScript,
  executeScript,
  exportScript,
  importScript
};
