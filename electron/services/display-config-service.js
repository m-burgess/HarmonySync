const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

/**
 * Display Configuration Service
 * Manages dynamic display configurations with persistence
 */

let displayConfigs = [];
let settingsPath = null;

// Default display configurations
const DEFAULT_DISPLAYS = [
  {
    id: 'audience',
    name: 'Audience',
    type: 'audience',
    deviceId: '',
    ndiOutput: '',
    enabled: true,
    order: 1
  },
  {
    id: 'confidence',
    name: 'Confidence Monitor',
    type: 'confidence',
    deviceId: '',
    ndiOutput: '',
    enabled: true,
    order: 2
  },
  {
    id: 'lower-thirds',
    name: 'Lower Thirds',
    type: 'lower-thirds',
    deviceId: '',
    ndiOutput: '',
    enabled: true,
    order: 3
  }
];

/**
 * Initialize display configuration service
 */
async function initialize() {
  try {
    const appDataPath = app.getPath('userData');
    settingsPath = path.join(appDataPath, 'settings');
    
    // Ensure settings directory exists
    await fs.ensureDir(settingsPath);
    
    // Load display configurations
    await loadDisplayConfigs();
    
    console.log('✅ Display configuration service initialized');
    console.log(`📁 Settings path: ${settingsPath}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize display configuration service:', error);
    throw error;
  }
}

/**
 * Load display configurations from JSON file
 */
async function loadDisplayConfigs() {
  const configPath = path.join(settingsPath, 'display_configs.json');
  try {
    if (await fs.pathExists(configPath)) {
      const data = await fs.readJson(configPath);
      displayConfigs = data.displays || DEFAULT_DISPLAYS;
    } else {
      // Create default configuration
      displayConfigs = [...DEFAULT_DISPLAYS];
      await saveDisplayConfigs();
    }
    console.log(`Loaded ${displayConfigs.length} display configurations`);
  } catch (error) {
    console.error('Error loading display configs:', error);
    displayConfigs = [...DEFAULT_DISPLAYS];
    await saveDisplayConfigs();
  }
}

/**
 * Save display configurations to JSON file
 */
async function saveDisplayConfigs() {
  const configPath = path.join(settingsPath, 'display_configs.json');
  try {
    await fs.writeJson(configPath, { displays: displayConfigs }, { spaces: 2 });
    console.log('Display configurations saved');
  } catch (error) {
    console.error('Error saving display configs:', error);
    throw error;
  }
}

/**
 * Get all display configurations
 */
function getAllDisplayConfigs() {
  return [...displayConfigs];
}

/**
 * Get a specific display configuration by id
 */
function getDisplayConfig(id) {
  return displayConfigs.find(d => d.id === id);
}

/**
 * Create a new display configuration
 */
async function createDisplayConfig(config) {
  const newConfig = {
    id: config.id || `display-${Date.now()}`,
    name: config.name,
    type: config.type || 'custom',
    deviceId: config.deviceId || '',
    ndiOutput: config.ndiOutput || '',
    enabled: config.enabled !== false,
    order: config.order || displayConfigs.length + 1
  };
  
  displayConfigs.push(newConfig);
  await saveDisplayConfigs();
  return newConfig;
}

/**
 * Update an existing display configuration
 */
async function updateDisplayConfig(id, updates) {
  const index = displayConfigs.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Display configuration not found: ${id}`);
  }
  
  displayConfigs[index] = {
    ...displayConfigs[index],
    ...updates,
    id // Preserve the original id
  };
  
  await saveDisplayConfigs();
  return displayConfigs[index];
}

/**
 * Delete a display configuration
 */
async function deleteDisplayConfig(id) {
  const index = displayConfigs.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Display configuration not found: ${id}`);
  }
  
  displayConfigs.splice(index, 1);
  await saveDisplayConfigs();
  return true;
}

/**
 * Reorder display configurations
 */
async function reorderDisplayConfigs(orderedIds) {
  const reordered = [];
  orderedIds.forEach((id, index) => {
    const config = displayConfigs.find(d => d.id === id);
    if (config) {
      reordered.push({
        ...config,
        order: index + 1
      });
    }
  });
  
  displayConfigs = reordered;
  await saveDisplayConfigs();
  return displayConfigs;
}

/**
 * Get enabled display configurations
 */
function getEnabledDisplayConfigs() {
  return displayConfigs
    .filter(d => d.enabled)
    .sort((a, b) => a.order - b.order);
}

module.exports = {
  initialize,
  getAllDisplayConfigs,
  getDisplayConfig,
  createDisplayConfig,
  updateDisplayConfig,
  deleteDisplayConfig,
  reorderDisplayConfigs,
  getEnabledDisplayConfigs
};
