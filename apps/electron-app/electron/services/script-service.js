"use strict";
/**
 * Script Service
 * Handles user-created JavaScript scripts with TypeScript OOP design
 * Provides sandboxed execution for custom automation and macros
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
exports.ScriptService = void 0;
exports.getScriptService = getScriptService;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const vm2_1 = require("vm2");
const services_1 = require("../types/services");
// ==================== Script Service Class ====================
/**
 * Script Service Implementation
 * Manages user scripts with sandboxed execution using VM2
 */
class ScriptService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'ScriptService';
        this.scriptsDir = path.join(electron_1.app.getPath('userData'), 'scripts');
    }
    /**
     * Initialize the script service
     */
    async onInitialize() {
        await this.initializeScriptStorage();
        this.log('info', 'Script service initialized');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'Script service disposed');
    }
    // ==================== Storage Methods ====================
    /**
     * Initialize script storage directory
     */
    async initializeScriptStorage() {
        try {
            await fs.ensureDir(this.scriptsDir);
            this.log('debug', `Script storage initialized at: ${this.scriptsDir}`);
        }
        catch (error) {
            this.handleError('initializeScriptStorage', error);
        }
    }
    // ==================== Public API Methods ====================
    /**
     * Get all scripts
     * @returns Promise resolving to array of script objects
     */
    async list() {
        try {
            await fs.ensureDir(this.scriptsDir);
            const files = await fs.readdir(this.scriptsDir);
            const scriptFiles = files.filter(f => f.endsWith('.js'));
            const scripts = [];
            for (const file of scriptFiles) {
                const scriptPath = path.join(this.scriptsDir, file);
                const content = await fs.readFile(scriptPath, 'utf8');
                const stats = await fs.stat(scriptPath);
                // Extract metadata from script comments if present
                const metadata = this.extractMetadata(content);
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
            this.log('debug', `Found ${scripts.length} scripts`);
            return scripts;
        }
        catch (error) {
            this.handleError('list', error);
        }
    }
    /**
     * Get a single script by ID
     * @param scriptId - Script ID
     * @returns Promise resolving to script object
     */
    async getScript(scriptId) {
        try {
            const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
            if (!await fs.pathExists(scriptPath)) {
                throw new Error(`Script not found: ${scriptId}`);
            }
            const content = await fs.readFile(scriptPath, 'utf8');
            const stats = await fs.stat(scriptPath);
            const metadata = this.extractMetadata(content);
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
        catch (error) {
            this.handleError('getScript', error);
        }
    }
    /**
     * Create a new script
     * @param scriptData - Script data
     * @returns Promise resolving to created script object
     */
    async save(scriptData) {
        try {
            const { name, description, author, code } = scriptData;
            if (!name || !code) {
                throw new Error('Script name and code are required');
            }
            // Generate ID from name
            const scriptId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
            // Check if script already exists
            if (await fs.pathExists(scriptPath)) {
                throw new Error(`Script with ID "${scriptId}" already exists`);
            }
            // Add metadata header to script
            const scriptContent = this.createScriptContent(name, description || 'No description', author || 'Unknown', '1.0.0', true, code);
            await fs.writeFile(scriptPath, scriptContent, 'utf8');
            this.log('info', `Script created: ${scriptId}`);
            return scriptId;
        }
        catch (error) {
            this.handleError('save', error);
        }
    }
    /**
     * Update an existing script
     * @param scriptId - Script ID
     * @param updates - Script updates
     * @returns Promise resolving to updated script object
     */
    async updateScript(scriptId, updates) {
        try {
            const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
            if (!await fs.pathExists(scriptPath)) {
                throw new Error(`Script not found: ${scriptId}`);
            }
            const currentScript = await this.getScript(scriptId);
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
            const scriptContent = this.createScriptContent(updatedMetadata.name, updatedMetadata.description, updatedMetadata.author, updatedMetadata.version, updatedMetadata.enabled, updatedCode);
            await fs.writeFile(scriptPath, scriptContent, 'utf8');
            this.log('info', `Script updated: ${scriptId}`);
            return await this.getScript(scriptId);
        }
        catch (error) {
            this.handleError('updateScript', error);
        }
    }
    /**
     * Delete a script
     * @param scriptId - Script ID
     * @returns Promise resolving to void
     */
    async delete(scriptId) {
        try {
            const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
            if (!await fs.pathExists(scriptPath)) {
                throw new Error(`Script not found: ${scriptId}`);
            }
            await fs.remove(scriptPath);
            this.log('info', `Script deleted: ${scriptId}`);
        }
        catch (error) {
            this.handleError('delete', error);
        }
    }
    // ==================== Validation Methods ====================
    /**
     * Validate script syntax
     * @param code - Script code
     * @returns Validation result
     */
    validateScript(code) {
        try {
            // Basic syntax check using Function constructor
            new Function(code);
            return {
                valid: true,
                errors: []
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [{
                        message: error.message || 'Unknown error',
                        line: error.lineNumber || 0,
                        column: error.columnNumber || 0
                    }]
            };
        }
    }
    // ==================== Execution Methods ====================
    /**
     * Execute a script in a sandboxed environment
     * @param scriptId - Script ID or direct code
     * @param params - HarmonySync API object and parameters
     * @param options - Execution options
     * @returns Promise resolving to script execution result
     */
    async execute(scriptId, params, options) {
        return this.executeScript(scriptId, params, options);
    }
    /**
     * Execute a script in a sandboxed environment (main implementation)
     * @param scriptId - Script ID or direct code
     * @param harmonyAPI - HarmonySync API object
     * @param options - Execution options
     * @returns Promise resolving to script execution result
     */
    async executeScript(scriptId, harmonyAPI, options = {}) {
        const timeout = options.timeout || 10000; // 10 seconds default
        const debugMode = options.debug || false;
        try {
            let code;
            if (scriptId.includes('\n') || scriptId.includes('{')) {
                // Direct code execution
                code = scriptId;
            }
            else {
                // Load script from file
                const script = await this.getScript(scriptId);
                if (!script.enabled) {
                    throw new Error(`Script "${scriptId}" is disabled`);
                }
                code = script.code;
            }
            // Validate before execution
            const validation = this.validateScript(code);
            if (!validation.valid) {
                throw new Error(`Script validation failed: ${validation.errors[0].message}`);
            }
            // Console output capture for debug mode
            const consoleOutput = [];
            // Create sandboxed VM
            const vm = new vm2_1.VM({
                timeout: timeout,
                sandbox: {
                    harmony: harmonyAPI || {},
                    console: this.createConsoleSandbox(consoleOutput, debugMode)
                }
            });
            const startTime = Date.now();
            const result = await vm.run(code);
            const executionTime = Date.now() - startTime;
            this.log('debug', `Script executed successfully in ${executionTime}ms`);
            return {
                success: true,
                result: result,
                error: null,
                executionTime: executionTime,
                consoleOutput: debugMode ? consoleOutput : undefined
            };
        }
        catch (error) {
            const executionTime = Date.now();
            this.log('error', 'Script execution error:', error);
            return {
                success: false,
                result: null,
                error: {
                    message: error.message || 'Unknown error',
                    stack: error.stack
                },
                executionTime: executionTime,
                consoleOutput: options.debug ? [] : undefined
            };
        }
    }
    /**
     * Create console sandbox for script execution
     * @param consoleOutput - Array to capture console output
     * @param debugMode - Whether debug mode is enabled
     * @returns Console object for sandbox
     */
    createConsoleSandbox(consoleOutput, debugMode) {
        return {
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
        };
    }
    // ==================== Import/Export Methods ====================
    /**
     * Export a script to a file
     * @param scriptId - Script ID
     * @param exportPath - Export file path
     * @returns Promise resolving to exported file path
     */
    async exportScript(scriptId, exportPath) {
        try {
            const script = await this.getScript(scriptId);
            const destinationPath = exportPath.endsWith('.js')
                ? exportPath
                : path.join(exportPath, `${scriptId}.js`);
            await fs.copy(script.filePath, destinationPath);
            this.log('info', `Script exported: ${scriptId} -> ${destinationPath}`);
            return destinationPath;
        }
        catch (error) {
            this.handleError('exportScript', error);
        }
    }
    /**
     * Import a script from a file
     * @param importPath - Import file path
     * @returns Promise resolving to imported script object
     */
    async importScript(importPath) {
        try {
            if (!await fs.pathExists(importPath)) {
                throw new Error(`Import file not found: ${importPath}`);
            }
            const code = await fs.readFile(importPath, 'utf8');
            const metadata = this.extractMetadata(code);
            const scriptData = {
                name: metadata.name || path.basename(importPath, '.js'),
                description: metadata.description || '',
                author: metadata.author || 'Unknown',
                code: code
            };
            const scriptId = await this.save(scriptData);
            this.log('info', `Script imported: ${scriptId}`);
            return await this.getScript(scriptId);
        }
        catch (error) {
            this.handleError('importScript', error);
        }
    }
    // ==================== Utility Methods ====================
    /**
     * Extract metadata from script comments
     * @param code - Script code
     * @returns Metadata object
     */
    extractMetadata(code) {
        const metadata = {
            name: null,
            description: null,
            author: null,
            version: null,
            enabled: true
        };
        // Match JSDoc-style comments
        const commentMatch = code.match(/\/\*\*[\s\S]*?\*\//);
        if (!commentMatch)
            return metadata;
        const comment = commentMatch[0];
        // Extract fields
        const nameMatch = comment.match(/@name\s+(.+)/);
        if (nameMatch)
            metadata.name = nameMatch[1].trim();
        const descMatch = comment.match(/@description\s+(.+)/);
        if (descMatch)
            metadata.description = descMatch[1].trim();
        const authorMatch = comment.match(/@author\s+(.+)/);
        if (authorMatch)
            metadata.author = authorMatch[1].trim();
        const versionMatch = comment.match(/@version\s+(.+)/);
        if (versionMatch)
            metadata.version = versionMatch[1].trim();
        const enabledMatch = comment.match(/@enabled\s+(.+)/);
        if (enabledMatch)
            metadata.enabled = enabledMatch[1].trim() === 'true';
        return metadata;
    }
    /**
     * Create script content with metadata header
     * @param name - Script name
     * @param description - Script description
     * @param author - Script author
     * @param version - Script version
     * @param enabled - Whether script is enabled
     * @param code - Script code
     * @returns Complete script content
     */
    createScriptContent(name, description, author, version, enabled, code) {
        return `/**
 * @name ${name}
 * @description ${description}
 * @author ${author}
 * @version ${version}
 * @enabled ${enabled}
 */

${code}`;
    }
}
exports.ScriptService = ScriptService;
// ==================== Singleton Export ====================
let scriptServiceInstance = null;
/**
 * Get or create the script service singleton
 */
function getScriptService(config) {
    if (!scriptServiceInstance) {
        scriptServiceInstance = new ScriptService(config);
    }
    return scriptServiceInstance;
}
// Export for backward compatibility
exports.default = ScriptService;
