"use strict";
/**
 * JSON Storage Service
 * JSON-based storage system for all data persistence
 * Replaces the old SQLite database with simple JSON files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONStorageService = void 0;
exports.getJSONStorageService = getJSONStorageService;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
/**
 * JSON Storage Service Implementation
 * Provides data persistence using JSON files
 */
class JSONStorageService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'JSONStorageService';
        this.storagePath = '';
        this.scheduledEvents = [];
        this.macros = [];
        this.gdriveSyncConfig = [];
        this.appSettings = {};
    }
    /**
     * Initialize the storage service
     */
    async onInitialize() {
        const appDataPath = electron_1.app.getPath('userData');
        this.storagePath = path.join(appDataPath, 'harmonysync-data');
        // Ensure storage directory exists
        await fs.ensureDir(this.storagePath);
        // Load all data from JSON files
        await this.loadScheduledEvents();
        await this.loadMacros();
        await this.loadGDriveSyncConfig();
        await this.loadAppSettings();
        this.log('info', 'JSON storage initialized successfully');
        this.log('info', `Storage path: ${this.storagePath}`);
    }
    /**
     * Clean up resources
     */
    onDispose() {
        // Clear in-memory data
        this.scheduledEvents = [];
        this.macros = [];
        this.gdriveSyncConfig = [];
        this.appSettings = {};
        this.log('info', 'JSON storage closed');
    }
    // ==================== Scheduled Events ====================
    /**
     * Load scheduled events from JSON file
     */
    async loadScheduledEvents() {
        const filePath = path.join(this.storagePath, 'scheduled-events.json');
        try {
            if (await fs.pathExists(filePath)) {
                this.scheduledEvents = await fs.readJson(filePath);
            }
            else {
                this.scheduledEvents = [];
                await this.saveScheduledEvents();
            }
        }
        catch (error) {
            this.log('error', 'Error loading scheduled events:', error);
            this.scheduledEvents = [];
        }
    }
    /**
     * Save scheduled events to JSON file
     */
    async saveScheduledEvents() {
        const filePath = path.join(this.storagePath, 'scheduled-events.json');
        await fs.writeJson(filePath, this.scheduledEvents, { spaces: 2 });
    }
    /**
     * Get all scheduled events
     */
    async getAllScheduledEvents() {
        this.ensureInitialized();
        return [...this.scheduledEvents];
    }
    /**
     * Get scheduled event by ID
     */
    async getScheduledEventById(id) {
        this.ensureInitialized();
        return this.scheduledEvents.find(e => e.id === id) || null;
    }
    /**
     * Create a new scheduled event
     */
    async createScheduledEvent(event) {
        this.ensureInitialized();
        const newEvent = {
            id: Date.now().toString(),
            title: event.title || 'Untitled Event',
            startTime: event.startTime || new Date().toISOString(),
            type: event.type || 'other',
            description: event.description,
            endTime: event.endTime,
            actions: event.actions || [],
            repeat: event.repeat,
            reminders: event.reminders,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.scheduledEvents.push(newEvent);
        await this.saveScheduledEvents();
        this.log('info', `Created scheduled event: ${newEvent.id}`);
        return newEvent;
    }
    /**
     * Update an existing scheduled event
     */
    async updateScheduledEvent(event) {
        this.ensureInitialized();
        const index = this.scheduledEvents.findIndex(e => e.id === event.id);
        if (index !== -1) {
            this.scheduledEvents[index] = {
                ...this.scheduledEvents[index],
                ...event,
                updatedAt: new Date().toISOString()
            };
            await this.saveScheduledEvents();
            this.log('info', `Updated scheduled event: ${event.id}`);
            return this.scheduledEvents[index];
        }
        this.log('warn', `Scheduled event not found: ${event.id}`);
        return null;
    }
    /**
     * Delete a scheduled event
     */
    async deleteScheduledEvent(id) {
        this.ensureInitialized();
        const initialLength = this.scheduledEvents.length;
        this.scheduledEvents = this.scheduledEvents.filter(e => e.id !== id);
        if (this.scheduledEvents.length < initialLength) {
            await this.saveScheduledEvents();
            this.log('info', `Deleted scheduled event: ${id}`);
            return true;
        }
        this.log('warn', `Scheduled event not found: ${id}`);
        return false;
    }
    /**
     * Get today's events
     */
    async getTodayEvents() {
        this.ensureInitialized();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.scheduledEvents.filter(e => {
            const eventDate = new Date(e.startTime);
            return eventDate >= today && eventDate < tomorrow;
        });
    }
    /**
     * Get upcoming events within specified hours
     */
    async getUpcomingEvents(hours = 24) {
        this.ensureInitialized();
        const now = new Date();
        const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
        return this.scheduledEvents.filter(e => {
            const eventDate = new Date(e.startTime);
            return eventDate >= now && eventDate <= futureTime;
        });
    }
    // ==================== Macros ====================
    /**
     * Load macros from JSON file
     */
    async loadMacros() {
        const filePath = path.join(this.storagePath, 'macros.json');
        try {
            if (await fs.pathExists(filePath)) {
                this.macros = await fs.readJson(filePath);
            }
            else {
                this.macros = [];
                await this.saveMacros();
            }
        }
        catch (error) {
            this.log('error', 'Error loading macros:', error);
            this.macros = [];
        }
    }
    /**
     * Save macros to JSON file
     */
    async saveMacros() {
        const filePath = path.join(this.storagePath, 'macros.json');
        await fs.writeJson(filePath, this.macros, { spaces: 2 });
    }
    /**
     * Get all macros
     */
    async getAllMacros() {
        this.ensureInitialized();
        return [...this.macros];
    }
    /**
     * Get macro by ID
     */
    async getMacroById(id) {
        this.ensureInitialized();
        return this.macros.find(m => m.id === id) || null;
    }
    /**
     * Create a new macro
     */
    async createMacro(macro) {
        this.ensureInitialized();
        const newMacro = {
            id: Date.now().toString(),
            name: macro.name || 'Untitled Macro',
            description: macro.description,
            actions: macro.actions || [],
            hotkey: macro.hotkey,
            enabled: macro.enabled ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.macros.push(newMacro);
        await this.saveMacros();
        this.log('info', `Created macro: ${newMacro.id}`);
        return newMacro;
    }
    /**
     * Update an existing macro
     */
    async updateMacro(macro) {
        this.ensureInitialized();
        const index = this.macros.findIndex(m => m.id === macro.id);
        if (index !== -1) {
            this.macros[index] = {
                ...this.macros[index],
                ...macro,
                updatedAt: new Date().toISOString()
            };
            await this.saveMacros();
            this.log('info', `Updated macro: ${macro.id}`);
            return this.macros[index];
        }
        this.log('warn', `Macro not found: ${macro.id}`);
        return null;
    }
    /**
     * Delete a macro
     */
    async deleteMacro(id) {
        this.ensureInitialized();
        const initialLength = this.macros.length;
        this.macros = this.macros.filter(m => m.id !== id);
        if (this.macros.length < initialLength) {
            await this.saveMacros();
            this.log('info', `Deleted macro: ${id}`);
            return true;
        }
        this.log('warn', `Macro not found: ${id}`);
        return false;
    }
    // ==================== Google Drive Sync ====================
    /**
     * Load Google Drive sync config from JSON file
     */
    async loadGDriveSyncConfig() {
        const filePath = path.join(this.storagePath, 'gdrive-sync.json');
        try {
            if (await fs.pathExists(filePath)) {
                this.gdriveSyncConfig = await fs.readJson(filePath);
            }
            else {
                this.gdriveSyncConfig = [];
                await this.saveGDriveSyncConfig();
            }
        }
        catch (error) {
            this.log('error', 'Error loading GDrive sync config:', error);
            this.gdriveSyncConfig = [];
        }
    }
    /**
     * Save Google Drive sync config to JSON file
     */
    async saveGDriveSyncConfig() {
        const filePath = path.join(this.storagePath, 'gdrive-sync.json');
        await fs.writeJson(filePath, this.gdriveSyncConfig, { spaces: 2 });
    }
    /**
     * Get Google Drive sync configuration
     */
    async getGDriveSyncConfig() {
        this.ensureInitialized();
        return [...this.gdriveSyncConfig];
    }
    /**
     * Add or update Google Drive sync folder
     */
    async addGDriveSyncFolder(folderId, localPath) {
        this.ensureInitialized();
        const existing = this.gdriveSyncConfig.find(c => c.folder_id === folderId);
        if (existing) {
            existing.local_path = localPath;
            existing.last_sync = new Date().toISOString();
        }
        else {
            this.gdriveSyncConfig.push({
                id: Date.now(),
                folder_id: folderId,
                local_path: localPath,
                last_sync: null,
                enabled: true
            });
        }
        await this.saveGDriveSyncConfig();
        this.log('info', `Added/updated GDrive sync folder: ${folderId}`);
        return this.gdriveSyncConfig;
    }
    /**
     * Update Google Drive sync status
     */
    async updateGDriveSyncStatus(folderId, lastSync) {
        this.ensureInitialized();
        const config = this.gdriveSyncConfig.find(c => c.folder_id === folderId);
        if (config) {
            config.last_sync = lastSync;
            await this.saveGDriveSyncConfig();
            return true;
        }
        return false;
    }
    /**
     * Remove Google Drive sync folder
     */
    async removeGDriveSyncFolder(folderId) {
        this.ensureInitialized();
        const initialLength = this.gdriveSyncConfig.length;
        this.gdriveSyncConfig = this.gdriveSyncConfig.filter(c => c.folder_id !== folderId);
        if (this.gdriveSyncConfig.length < initialLength) {
            await this.saveGDriveSyncConfig();
            this.log('info', `Removed GDrive sync folder: ${folderId}`);
            return true;
        }
        return false;
    }
    // ==================== App Settings ====================
    /**
     * Load app settings from JSON file
     */
    async loadAppSettings() {
        const filePath = path.join(this.storagePath, 'settings.json');
        try {
            if (await fs.pathExists(filePath)) {
                this.appSettings = await fs.readJson(filePath);
            }
            else {
                this.appSettings = {};
                await this.saveAppSettings();
            }
        }
        catch (error) {
            this.log('error', 'Error loading app settings:', error);
            this.appSettings = {};
        }
    }
    /**
     * Save app settings to JSON file
     */
    async saveAppSettings() {
        const filePath = path.join(this.storagePath, 'settings.json');
        await fs.writeJson(filePath, this.appSettings, { spaces: 2 });
    }
    /**
     * Get a setting value
     */
    async getSetting(key) {
        this.ensureInitialized();
        return this.appSettings[key];
    }
    /**
     * Set a setting value
     */
    async setSetting(key, value) {
        this.ensureInitialized();
        this.appSettings[key] = value;
        await this.saveAppSettings();
        this.log('debug', `Setting saved: ${key}`);
        return value;
    }
    /**
     * Get all settings
     */
    async getAllSettings() {
        this.ensureInitialized();
        return { ...this.appSettings };
    }
    // ==================== YouTube Links ====================
    /**
     * Add YouTube link to presentation
     */
    async addYouTubeLink(presentationPath, url) {
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
        }
        catch (error) {
            this.handleError(`addYouTubeLink(${presentationPath}, ${url})`, error);
        }
    }
    /**
     * Get YouTube links for presentation
     */
    async getYouTubeLinks(presentationPath) {
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
        }
        catch (error) {
            this.log('error', `Error reading YouTube links from ${presentationPath}:`, error);
            return [];
        }
    }
    /**
     * Delete YouTube link from presentation
     */
    async deleteYouTubeLink(presentationPath, url) {
        const youtubePath = path.join(presentationPath, 'youtube.txt');
        try {
            if (await fs.pathExists(youtubePath)) {
                const content = await fs.readFile(youtubePath, 'utf8');
                const urls = content.split('\n').filter(line => line.trim() && line !== url);
                await fs.writeFile(youtubePath, urls.join('\n') + '\n');
                return true;
            }
            return false;
        }
        catch (error) {
            this.log('error', `Error deleting YouTube link from ${presentationPath}:`, error);
            return false;
        }
    }
    // ==================== Song/Presentation Metadata ====================
    /**
     * Get song metadata
     */
    async getSongMetadata(songPath) {
        const metadataPath = path.join(songPath, 'harmonysync.json');
        try {
            if (await fs.pathExists(metadataPath)) {
                return await fs.readJson(metadataPath);
            }
            return null;
        }
        catch (error) {
            this.log('error', `Error reading song metadata from ${songPath}:`, error);
            return null;
        }
    }
    /**
     * Save song metadata
     */
    async saveSongMetadata(songPath, metadata) {
        const metadataPath = path.join(songPath, 'harmonysync.json');
        try {
            await fs.writeJson(metadataPath, {
                ...metadata,
                updated_at: new Date().toISOString()
            }, { spaces: 2 });
            return true;
        }
        catch (error) {
            this.log('error', `Error saving song metadata to ${songPath}:`, error);
            return false;
        }
    }
    // ==================== Compatibility Layer ====================
    /**
     * Generic query method (compatibility layer)
     * @deprecated Use specific methods instead
     */
    async query(_sql, _params = []) {
        this.log('warn', 'Generic query() called - this should be refactored to use specific methods');
        return [];
    }
    /**
     * Generic run method (compatibility layer)
     * @deprecated Use specific methods instead
     */
    async run(_sql, _params = []) {
        this.log('warn', 'Generic run() called - this should be refactored to use specific methods');
        return { changes: 0 };
    }
    /**
     * Generic get method (compatibility layer)
     * @deprecated Use specific methods instead
     */
    async get(_sql, _params = []) {
        this.log('warn', 'Generic get() called - this should be refactored to use specific methods');
        return null;
    }
    /**
     * Generic all method (compatibility layer)
     * @deprecated Use specific methods instead
     */
    async all(_sql, _params = []) {
        this.log('warn', 'Generic all() called - this should be refactored to use specific methods');
        return [];
    }
    /**
     * Get storage path
     */
    getStoragePath() {
        return this.storagePath;
    }
}
exports.JSONStorageService = JSONStorageService;
// Export singleton instance
let storageInstance = null;
/**
 * Get or create the JSON storage service singleton
 */
function getJSONStorageService(config) {
    if (!storageInstance) {
        storageInstance = new JSONStorageService(config);
    }
    return storageInstance;
}
// Export for backward compatibility
exports.default = JSONStorageService;
