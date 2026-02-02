"use strict";
/**
 * Macro Service
 * Handles macro execution and management with TypeScript OOP design
 *
 * ⚠️  NOTE: Database-dependent CRUD functions in this file are DEPRECATED.
 * The IPC handlers now call json-storage methods directly for all CRUD operations.
 * Only executeMacro() and validateMacro() are still actively used.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacroService = void 0;
exports.getMacroService = getMacroService;
const services_1 = require("../types/services");
// ==================== Macro Service Class ====================
/**
 * Macro Service Implementation
 * Provides macro execution and validation with proper error handling
 */
class MacroService extends services_1.BaseElectronService {
    // Valid macro actions constant
    static { this.VALID_ACTIONS = [
        'start_preservice_music',
        'stop_preservice_music',
        'send_midi_note',
        'display_black_screen',
        'clear_displays'
    ]; }
    constructor(config) {
        super(config);
        this.serviceName = 'MacroService';
        this.appHandle = null;
    }
    /**
     * Initialize the macro service
     */
    async onInitialize() {
        this.log('info', 'Macro service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.appHandle = null;
        this.log('info', 'Macro service disposed');
    }
    /**
     * Set the application event emitter handle for macro execution
     * @param handle - Event emitter handle from main process
     */
    setAppHandle(handle) {
        this.appHandle = handle;
        this.log('debug', 'App handle set for macro execution');
    }
    // ==================== Public API Methods ====================
    /**
     * Get all macros
     * @returns Promise resolving to array of macros
     */
    async getAll() {
        this.log('debug', 'Getting all macros (deprecated - use json-storage)');
        // Deprecated - actual implementation in IPC handlers
        return [];
    }
    /**
     * Create a new macro
     * @param macro - Macro data
     * @returns Promise resolving to macro ID
     */
    async create(macro) {
        const validation = this.validateMacro(macro);
        if (!validation.valid) {
            throw new Error(`Invalid macro: ${validation.errors.join(', ')}`);
        }
        this.log('info', `Creating macro: ${macro.name}`);
        // Deprecated - actual implementation in IPC handlers
        return 'deprecated';
    }
    /**
     * Update an existing macro
     * @param id - Macro ID
     * @param macro - Updated macro data
     */
    async update(id, macro) {
        const validation = this.validateMacro(macro);
        if (!validation.valid) {
            throw new Error(`Invalid macro: ${validation.errors.join(', ')}`);
        }
        this.log('info', `Updating macro ${id}`);
        // Deprecated - actual implementation in IPC handlers
    }
    /**
     * Delete a macro
     * @param id - Macro ID
     */
    async delete(id) {
        this.log('info', `Deleting macro ${id}`);
        // Deprecated - actual implementation in IPC handlers
    }
    /**
     * Execute a macro
     * @param id - Macro ID
     */
    async execute(id) {
        this.log('info', `Executing macro: ${id}`);
        // This would typically fetch the macro and call executeMacroAction
        // Actual implementation depends on how macros are stored
    }
    // ==================== Execution Methods ====================
    /**
     * Execute a macro action
     * @param macroId - Macro ID
     * @param macroAction - Macro action type
     * @param options - Optional parameters
     */
    async executeMacroAction(macroId, macroAction, options = {}) {
        try {
            if (!this.appHandle) {
                throw new Error('App handle not set. Cannot execute macro.');
            }
            this.log('info', `Executing macro: ${macroId} (${macroAction})`);
            switch (macroAction) {
                case 'start_preservice_music':
                    this.executeStartPreserviceMusic();
                    break;
                case 'stop_preservice_music':
                    this.executeStopPreserviceMusic();
                    break;
                case 'send_midi_note':
                    this.executeSendMidiNote(options);
                    break;
                case 'display_black_screen':
                    this.executeDisplayBlackScreen();
                    break;
                case 'clear_displays':
                    this.executeClearDisplays();
                    break;
                default:
                    throw new Error(`Unknown macro action: ${macroAction}`);
            }
            this.emit('macroExecuted', { macroId, action: macroAction });
        }
        catch (error) {
            this.handleError(`executeMacroAction(${macroId}, ${macroAction})`, error);
        }
    }
    /**
     * Start preservice music
     */
    executeStartPreserviceMusic() {
        if (!this.appHandle)
            return;
        this.appHandle.emit('main', 'start-preservice-music', {});
        this.log('debug', 'Started preservice music');
    }
    /**
     * Stop preservice music
     */
    executeStopPreserviceMusic() {
        if (!this.appHandle)
            return;
        this.appHandle.emit('main', 'stop-preservice-music', {});
        this.log('debug', 'Stopped preservice music');
    }
    /**
     * Send MIDI note
     * @param options - MIDI note options
     */
    executeSendMidiNote(options) {
        if (!this.appHandle)
            return;
        if (!options.midiNote) {
            throw new Error('MIDI note value is required for send_midi_note action');
        }
        const midiData = {
            note: options.midiNote,
            velocity: options.velocity || 127,
            duration: options.duration || 100
        };
        this.appHandle.emit('main', 'send-midi-note', midiData);
        this.log('debug', `Sent MIDI note: ${midiData.note}`);
    }
    /**
     * Display black screen
     */
    executeDisplayBlackScreen() {
        if (!this.appHandle)
            return;
        this.appHandle.emit('audience', 'display-black-screen', {});
        this.log('debug', 'Displayed black screen');
    }
    /**
     * Clear all displays
     */
    executeClearDisplays() {
        if (!this.appHandle)
            return;
        this.appHandle.emit('audience', 'clear-display', {});
        this.appHandle.emit('confidence', 'clear-display', {});
        this.appHandle.emit('lowerThirds', 'clear-display', {});
        this.log('debug', 'Cleared all displays');
    }
    // ==================== Validation Methods ====================
    /**
     * Validate macro data
     * @param macro - Macro object
     * @returns Validation result
     */
    validateMacro(macro) {
        const errors = [];
        if (!macro.name || typeof macro.name !== 'string') {
            errors.push('Macro name is required');
        }
        if (!macro.action || typeof macro.action !== 'string') {
            errors.push('Macro action is required');
        }
        if (macro.action && !MacroService.VALID_ACTIONS.includes(macro.action)) {
            errors.push(`Invalid macro action. Must be one of: ${MacroService.VALID_ACTIONS.join(', ')}`);
        }
        // Validate MIDI note if action is send_midi_note
        if (macro.action === 'send_midi_note' && macro.options) {
            if (macro.options.midiNote === undefined) {
                errors.push('MIDI note is required for send_midi_note action');
            }
            else if (typeof macro.options.midiNote !== 'number' ||
                macro.options.midiNote < 0 ||
                macro.options.midiNote > 127) {
                errors.push('MIDI note must be a number between 0 and 127');
            }
            if (macro.options.velocity !== undefined &&
                (typeof macro.options.velocity !== 'number' ||
                    macro.options.velocity < 0 ||
                    macro.options.velocity > 127)) {
                errors.push('MIDI velocity must be a number between 0 and 127');
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    // ==================== Deprecated Database Methods ====================
    // Note: These methods are kept for backward compatibility but are deprecated
    /**
     * Get macro by ID (deprecated)
     * @param _macroId - Macro ID
     * @returns Promise resolving to macro object
     */
    async getMacroById(_macroId) {
        this.log('warn', 'getMacroById is deprecated - use json-storage directly');
        return null;
    }
    /**
     * Get macros for a specific slide (deprecated)
     * @param _slideId - Slide ID
     * @returns Promise resolving to array of macros
     */
    async getMacrosForSlide(_slideId) {
        this.log('warn', 'getMacrosForSlide is deprecated - use json-storage directly');
        return [];
    }
    /**
     * Add macro to slide (deprecated)
     * @param _slideId - Slide ID
     * @param _macroId - Macro ID
     */
    async addMacroToSlide(_slideId, _macroId) {
        this.log('warn', 'addMacroToSlide is deprecated - use json-storage directly');
    }
    /**
     * Remove macro from slide (deprecated)
     * @param _slideId - Slide ID
     * @param _macroId - Macro ID
     */
    async removeMacroFromSlide(_slideId, _macroId) {
        this.log('warn', 'removeMacroFromSlide is deprecated - use json-storage directly');
    }
}
exports.MacroService = MacroService;
// ==================== Singleton Export ====================
let macroServiceInstance = null;
/**
 * Get or create the macro service singleton
 */
function getMacroService(config) {
    if (!macroServiceInstance) {
        macroServiceInstance = new MacroService(config);
    }
    return macroServiceInstance;
}
// Export for backward compatibility
exports.default = MacroService;
