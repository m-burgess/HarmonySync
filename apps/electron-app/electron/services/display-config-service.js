"use strict";
/**
 * Display Configuration Service
 * Manages dynamic display configurations with persistence
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
exports.DisplayConfigService = void 0;
exports.getDisplayConfigService = getDisplayConfigService;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const services_1 = require("../types/services");
/**
 * Default display configurations
 */
const DEFAULT_DISPLAYS = [
    {
        id: 'audience',
        name: 'Audience',
        type: 'audience',
        enabled: true,
        order: 1,
        settings: {
            deviceId: '',
            ndiOutput: ''
        }
    },
    {
        id: 'confidence',
        name: 'Confidence Monitor',
        type: 'confidence',
        enabled: true,
        order: 2,
        settings: {
            deviceId: '',
            ndiOutput: ''
        }
    },
    {
        id: 'lower-thirds',
        name: 'Lower Thirds',
        type: 'lowerthirds',
        enabled: true,
        order: 3,
        settings: {
            deviceId: '',
            ndiOutput: ''
        }
    }
];
/**
 * Display Configuration Service Implementation
 * Manages display configurations with JSON persistence
 */
class DisplayConfigService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'DisplayConfigService';
        this.displayConfigs = [];
        this.settingsPath = '';
    }
    /**
     * Initialize the display configuration service
     */
    async onInitialize() {
        const appDataPath = electron_1.app.getPath('userData');
        this.settingsPath = path.join(appDataPath, 'settings');
        // Ensure settings directory exists
        await fs.ensureDir(this.settingsPath);
        // Load display configurations
        await this.loadDisplayConfigs();
        this.log('info', 'Display configuration service initialized');
        this.log('info', `Settings path: ${this.settingsPath}`);
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.displayConfigs = [];
        this.log('info', 'Display configuration service disposed');
    }
    /**
     * Load display configurations from JSON file
     */
    async loadDisplayConfigs() {
        const configPath = path.join(this.settingsPath, 'display_configs.json');
        try {
            if (await fs.pathExists(configPath)) {
                const data = await fs.readJson(configPath);
                this.displayConfigs = data.displays || [...DEFAULT_DISPLAYS];
                this.log('info', `Loaded ${this.displayConfigs.length} display configurations`);
            }
            else {
                // Create default configuration
                this.displayConfigs = [...DEFAULT_DISPLAYS];
                await this.saveDisplayConfigs();
                this.log('info', 'Created default display configurations');
            }
        }
        catch (error) {
            this.log('error', 'Error loading display configs:', error);
            this.displayConfigs = [...DEFAULT_DISPLAYS];
            await this.saveDisplayConfigs();
        }
    }
    /**
     * Save display configurations to JSON file
     */
    async saveDisplayConfigs() {
        const configPath = path.join(this.settingsPath, 'display_configs.json');
        try {
            await fs.writeJson(configPath, { displays: this.displayConfigs }, { spaces: 2 });
            this.log('debug', 'Display configurations saved');
            this.emit('configs-saved', this.displayConfigs);
        }
        catch (error) {
            this.handleError('saveDisplayConfigs', error);
        }
    }
    /**
     * Get all display configurations
     */
    async getAll() {
        this.ensureInitialized();
        return [...this.displayConfigs];
    }
    /**
     * Get a specific display configuration by id
     */
    async get(id) {
        this.ensureInitialized();
        const config = this.displayConfigs.find(d => d.id === id);
        if (!config) {
            this.log('warn', `Display configuration not found: ${id}`);
            return null;
        }
        return { ...config };
    }
    /**
     * Get enabled display configurations sorted by order
     */
    async getEnabled() {
        this.ensureInitialized();
        return this.displayConfigs
            .filter(d => d.enabled)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(d => ({ ...d }));
    }
    /**
     * Create a new display configuration
     */
    async create(config) {
        this.ensureInitialized();
        // Generate unique ID
        const randomStr = Math.random().toString(36).substring(2, 9);
        const id = config.id || `display-${Date.now()}-${randomStr}`;
        // Validate required fields
        if (!config.name) {
            throw new Error('Display configuration name is required');
        }
        const newConfig = {
            id,
            name: config.name,
            type: config.type || 'custom',
            enabled: config.enabled ?? true,
            displayId: config.displayId,
            bounds: config.bounds,
            settings: config.settings || {},
            order: config.order || this.displayConfigs.length + 1
        };
        this.displayConfigs.push(newConfig);
        await this.saveDisplayConfigs();
        this.log('info', `Created display configuration: ${id}`);
        this.emit('config-created', newConfig);
        return id;
    }
    /**
     * Update an existing display configuration
     */
    async update(id, updates) {
        this.ensureInitialized();
        const index = this.displayConfigs.findIndex(d => d.id === id);
        if (index === -1) {
            throw new Error(`Display configuration not found: ${id}`);
        }
        // Merge updates while preserving id
        this.displayConfigs[index] = {
            ...this.displayConfigs[index],
            ...updates,
            id // Preserve the original id
        };
        await this.saveDisplayConfigs();
        this.log('info', `Updated display configuration: ${id}`);
        this.emit('config-updated', this.displayConfigs[index]);
    }
    /**
     * Delete a display configuration
     */
    async delete(id) {
        this.ensureInitialized();
        const index = this.displayConfigs.findIndex(d => d.id === id);
        if (index === -1) {
            throw new Error(`Display configuration not found: ${id}`);
        }
        const deletedConfig = this.displayConfigs[index];
        this.displayConfigs.splice(index, 1);
        await this.saveDisplayConfigs();
        this.log('info', `Deleted display configuration: ${id}`);
        this.emit('config-deleted', { id, config: deletedConfig });
    }
    /**
     * Reorder display configurations
     * @param ids - Array of display IDs in the new order
     */
    async reorder(ids) {
        this.ensureInitialized();
        const reordered = [];
        ids.forEach((id, index) => {
            const config = this.displayConfigs.find(d => d.id === id);
            if (config) {
                reordered.push({
                    ...config,
                    order: index + 1
                });
            }
            else {
                this.log('warn', `Display configuration not found during reorder: ${id}`);
            }
        });
        // Add any configs that weren't in the reorder list (shouldn't happen normally)
        this.displayConfigs.forEach(config => {
            if (!ids.includes(config.id)) {
                this.log('warn', `Display configuration not in reorder list, appending: ${config.id}`);
                reordered.push(config);
            }
        });
        this.displayConfigs = reordered;
        await this.saveDisplayConfigs();
        this.log('info', `Reordered ${reordered.length} display configurations`);
        this.emit('configs-reordered', this.displayConfigs);
    }
    /**
     * Enable a display configuration
     */
    async enable(id) {
        await this.update(id, { enabled: true });
        this.log('info', `Enabled display configuration: ${id}`);
    }
    /**
     * Disable a display configuration
     */
    async disable(id) {
        await this.update(id, { enabled: false });
        this.log('info', `Disabled display configuration: ${id}`);
    }
    /**
     * Reset to default display configurations
     */
    async resetToDefaults() {
        this.ensureInitialized();
        this.displayConfigs = [...DEFAULT_DISPLAYS];
        await this.saveDisplayConfigs();
        this.log('info', 'Reset display configurations to defaults');
        this.emit('configs-reset', this.displayConfigs);
    }
    /**
     * Get display configuration by type
     */
    async getByType(type) {
        this.ensureInitialized();
        return this.displayConfigs
            .filter(d => d.type === type)
            .map(d => ({ ...d }));
    }
    /**
     * Check if a display configuration exists
     */
    async exists(id) {
        this.ensureInitialized();
        return this.displayConfigs.some(d => d.id === id);
    }
    /**
     * Get total count of display configurations
     */
    getCount() {
        return this.displayConfigs.length;
    }
    /**
     * Get count of enabled display configurations
     */
    getEnabledCount() {
        return this.displayConfigs.filter(d => d.enabled).length;
    }
}
exports.DisplayConfigService = DisplayConfigService;
// Export singleton instance
let displayConfigInstance = null;
/**
 * Get or create the display config service singleton
 */
function getDisplayConfigService(config) {
    if (!displayConfigInstance) {
        displayConfigInstance = new DisplayConfigService(config);
    }
    return displayConfigInstance;
}
// Export for backward compatibility
exports.default = DisplayConfigService;
