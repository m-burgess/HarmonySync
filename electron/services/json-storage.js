const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

/**
 * JSON-based storage system to replace SQLite database
 * Uses simple JSON files for all data persistence
 */

let storagePath = null;
let scheduledEvents = [];
let macros = [];
let gdriveSyncConfig = [];
let appSettings = {};

// Initialize storage paths
async function initialize() {
  try {
    const appDataPath = app.getPath('userData');
    storagePath = path.join(appDataPath, 'harmonysync-data');
    
    // Ensure storage directory exists
    await fs.ensureDir(storagePath);
    
    // Load all data from JSON files
    await loadScheduledEvents();
    await loadMacros();
    await loadGDriveSyncConfig();
    await loadAppSettings();
    
    console.log('✅ JSON storage initialized successfully');
    console.log(`📁 Storage path: ${storagePath}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize JSON storage:', error);
    throw error;
  }
}

// === SCHEDULED EVENTS ===

async function loadScheduledEvents() {
  const filePath = path.join(storagePath, 'scheduled-events.json');
  try {
    if (await fs.pathExists(filePath)) {
      scheduledEvents = await fs.readJson(filePath);
    } else {
      scheduledEvents = [];
      await saveScheduledEvents();
    }
  } catch (error) {
    console.error('Error loading scheduled events:', error);
    scheduledEvents = [];
  }
}

async function saveScheduledEvents() {
  const filePath = path.join(storagePath, 'scheduled-events.json');
  await fs.writeJson(filePath, scheduledEvents, { spaces: 2 });
}

async function getAllScheduledEvents() {
  return scheduledEvents;
}

async function getScheduledEventById(id) {
  return scheduledEvents.find(e => e.id === id) || null;
}

async function createScheduledEvent(event) {
  const newEvent = {
    id: Date.now(),
    ...event,
    created_at: new Date().toISOString()
  };
  scheduledEvents.push(newEvent);
  await saveScheduledEvents();
  return newEvent;
}

async function updateScheduledEvent(event) {
  const index = scheduledEvents.findIndex(e => e.id === event.id);
  if (index !== -1) {
    scheduledEvents[index] = { ...scheduledEvents[index], ...event };
    await saveScheduledEvents();
    return scheduledEvents[index];
  }
  return null;
}

async function deleteScheduledEvent(id) {
  const initialLength = scheduledEvents.length;
  scheduledEvents = scheduledEvents.filter(e => e.id !== id);
  if (scheduledEvents.length < initialLength) {
    await saveScheduledEvents();
    return true;
  }
  return false;
}

async function getTodayEvents() {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return scheduledEvents.filter(e => e.day_of_week === today && e.enabled);
}

async function getUpcomingEvents(hours = 24) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  return scheduledEvents.filter(e => {
    if (!e.enabled) return false;
    
    // Same day
    if (e.day_of_week === currentDay) {
      return e.time >= currentTime;
    }
    
    // Future days within the hour range
    const daysUntil = (e.day_of_week - currentDay + 7) % 7;
    return daysUntil * 24 <= hours;
  });
}

// === MACROS ===

async function loadMacros() {
  const filePath = path.join(storagePath, 'macros.json');
  try {
    if (await fs.pathExists(filePath)) {
      macros = await fs.readJson(filePath);
    } else {
      macros = [];
      await saveMacros();
    }
  } catch (error) {
    console.error('Error loading macros:', error);
    macros = [];
  }
}

async function saveMacros() {
  const filePath = path.join(storagePath, 'macros.json');
  await fs.writeJson(filePath, macros, { spaces: 2 });
}

async function getAllMacros() {
  return macros;
}

async function getMacroById(id) {
  return macros.find(m => m.id === id) || null;
}

async function createMacro(macro) {
  const newMacro = {
    id: Date.now(),
    ...macro,
    created_at: new Date().toISOString()
  };
  macros.push(newMacro);
  await saveMacros();
  return newMacro;
}

async function updateMacro(macro) {
  const index = macros.findIndex(m => m.id === macro.id);
  if (index !== -1) {
    macros[index] = { ...macros[index], ...macro };
    await saveMacros();
    return macros[index];
  }
  return null;
}

async function deleteMacro(id) {
  const initialLength = macros.length;
  macros = macros.filter(m => m.id !== id);
  if (macros.length < initialLength) {
    await saveMacros();
    return true;
  }
  return false;
}

async function getMacrosForSlide(slideId) {
  // Macros are associated with slides via a slideAssociations array
  return macros.filter(m => m.slideAssociations && m.slideAssociations.includes(slideId));
}

async function addMacroToSlide(slideId, macroId) {
  const macro = macros.find(m => m.id === macroId);
  if (macro) {
    if (!macro.slideAssociations) {
      macro.slideAssociations = [];
    }
    if (!macro.slideAssociations.includes(slideId)) {
      macro.slideAssociations.push(slideId);
      await saveMacros();
    }
    return true;
  }
  return false;
}

async function removeMacroFromSlide(slideId, macroId) {
  const macro = macros.find(m => m.id === macroId);
  if (macro && macro.slideAssociations) {
    macro.slideAssociations = macro.slideAssociations.filter(id => id !== slideId);
    await saveMacros();
    return true;
  }
  return false;
}

// === GOOGLE DRIVE SYNC ===

async function loadGDriveSyncConfig() {
  const filePath = path.join(storagePath, 'gdrive-sync.json');
  try {
    if (await fs.pathExists(filePath)) {
      gdriveSyncConfig = await fs.readJson(filePath);
    } else {
      gdriveSyncConfig = [];
      await saveGDriveSyncConfig();
    }
  } catch (error) {
    console.error('Error loading GDrive sync config:', error);
    gdriveSyncConfig = [];
  }
}

async function saveGDriveSyncConfig() {
  const filePath = path.join(storagePath, 'gdrive-sync.json');
  await fs.writeJson(filePath, gdriveSyncConfig, { spaces: 2 });
}

async function getGDriveSyncConfig() {
  return gdriveSyncConfig;
}

async function addGDriveSyncFolder(folderId, localPath) {
  const existing = gdriveSyncConfig.find(c => c.folder_id === folderId);
  if (existing) {
    existing.local_path = localPath;
    existing.last_sync = new Date().toISOString();
  } else {
    gdriveSyncConfig.push({
      id: Date.now(),
      folder_id: folderId,
      local_path: localPath,
      last_sync: null,
      enabled: true
    });
  }
  await saveGDriveSyncConfig();
  return gdriveSyncConfig;
}

async function updateGDriveSyncStatus(folderId, lastSync) {
  const config = gdriveSyncConfig.find(c => c.folder_id === folderId);
  if (config) {
    config.last_sync = lastSync;
    await saveGDriveSyncConfig();
    return true;
  }
  return false;
}

async function removeGDriveSyncFolder(folderId) {
  const initialLength = gdriveSyncConfig.length;
  gdriveSyncConfig = gdriveSyncConfig.filter(c => c.folder_id !== folderId);
  if (gdriveSyncConfig.length < initialLength) {
    await saveGDriveSyncConfig();
    return true;
  }
  return false;
}

// === APP SETTINGS ===

async function loadAppSettings() {
  const filePath = path.join(storagePath, 'settings.json');
  try {
    if (await fs.pathExists(filePath)) {
      appSettings = await fs.readJson(filePath);
    } else {
      appSettings = {};
      await saveAppSettings();
    }
  } catch (error) {
    console.error('Error loading app settings:', error);
    appSettings = {};
  }
}

async function saveAppSettings() {
  const filePath = path.join(storagePath, 'settings.json');
  await fs.writeJson(filePath, appSettings, { spaces: 2 });
}

async function getSetting(key) {
  return appSettings[key];
}

async function setSetting(key, value) {
  appSettings[key] = value;
  await saveAppSettings();
  return value;
}

async function getAllSettings() {
  return appSettings;
}

// === YOUTUBE LINKS (Per-Presentation) ===

async function addYouTubeLink(presentationPath, url) {
  const youtubePath = path.join(presentationPath, 'youtube.txt');
  try {
    let content = '';
    if (await fs.pathExists(youtubePath)) {
      content = await fs.readFile(youtubePath, 'utf8');
    }
    
    // Add URL if not already present
    const urls = content.split('\n').filter(line => line.trim());
    if (!urls.includes(url)) {
      urls.push(url);
      await fs.writeFile(youtubePath, urls.join('\n') + '\n');
    }
    
    return { id: Date.now(), url, presentation_path: presentationPath };
  } catch (error) {
    console.error('Error adding YouTube link:', error);
    throw error;
  }
}

async function getYouTubeLinks(presentationPath) {
  const youtubePath = path.join(presentationPath, 'youtube.txt');
  try {
    if (await fs.pathExists(youtubePath)) {
      const content = await fs.readFile(youtubePath, 'utf8');
      const urls = content.split('\n').filter(line => line.trim());
      return urls.map((url, index) => ({
        id: index,
        url,
        presentation_path: presentationPath
      }));
    }
    return [];
  } catch (error) {
    console.error('Error reading YouTube links:', error);
    return [];
  }
}

async function deleteYouTubeLink(presentationPath, url) {
  const youtubePath = path.join(presentationPath, 'youtube.txt');
  try {
    if (await fs.pathExists(youtubePath)) {
      const content = await fs.readFile(youtubePath, 'utf8');
      const urls = content.split('\n').filter(line => line.trim() && line !== url);
      await fs.writeFile(youtubePath, urls.join('\n') + '\n');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting YouTube link:', error);
    return false;
  }
}

// === SONG/PRESENTATION METADATA (Per-Folder) ===

async function getSongMetadata(songPath) {
  const metadataPath = path.join(songPath, 'harmonysync.json');
  try {
    if (await fs.pathExists(metadataPath)) {
      return await fs.readJson(metadataPath);
    }
    return null;
  } catch (error) {
    console.error('Error reading song metadata:', error);
    return null;
  }
}

async function saveSongMetadata(songPath, metadata) {
  const metadataPath = path.join(songPath, 'harmonysync.json');
  try {
    await fs.writeJson(metadataPath, {
      ...metadata,
      updated_at: new Date().toISOString()
    }, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving song metadata:', error);
    return false;
  }
}

// === COMPATIBILITY LAYER (for old database calls) ===

// Provide a fake connection object for services that expect it
function getConnection() {
  return {
    prepare: (sql) => ({
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0 })
    }),
    exec: () => {},
    close: () => {}
  };
}

// Generic query/run/get/all methods (mostly for compatibility)
async function query(sql, params = []) {
  console.warn('⚠️  Generic query() called - this should be refactored to use specific methods');
  return [];
}

async function run(sql, params = []) {
  console.warn('⚠️  Generic run() called - this should be refactored to use specific methods');
  return { changes: 0 };
}

async function get(sql, params = []) {
  console.warn('⚠️  Generic get() called - this should be refactored to use specific methods');
  return null;
}

async function all(sql, params = []) {
  console.warn('⚠️  Generic all() called - this should be refactored to use specific methods');
  return [];
}

function close() {
  // No-op for JSON storage
  console.log('📁 JSON storage closed');
}

module.exports = {
  // Core
  initialize,
  getConnection,
  close,
  
  // Compatibility layer
  query,
  run,
  get,
  all,
  
  // Scheduled Events
  getAllScheduledEvents,
  getScheduledEventById,
  createScheduledEvent,
  updateScheduledEvent,
  deleteScheduledEvent,
  getTodayEvents,
  getUpcomingEvents,
  
  // Macros
  getAllMacros,
  getMacroById,
  createMacro,
  updateMacro,
  deleteMacro,
  getMacrosForSlide,
  addMacroToSlide,
  removeMacroFromSlide,
  
  // Google Drive Sync
  getGDriveSyncConfig,
  addGDriveSyncFolder,
  updateGDriveSyncStatus,
  removeGDriveSyncFolder,
  
  // YouTube Links
  addYouTubeLink,
  getYouTubeLinks,
  deleteYouTubeLink,
  
  // Song/Presentation Metadata
  getSongMetadata,
  saveSongMetadata,
  
  // Settings
  getSetting,
  setSetting,
  getAllSettings
};
