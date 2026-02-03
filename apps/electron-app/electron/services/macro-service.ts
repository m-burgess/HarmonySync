/**
 * Macro Service
 * Handles macro execution and management with TypeScript OOP design
 * 
 * ⚠️  NOTE: Database-dependent CRUD functions in this file are DEPRECATED.
 * The IPC handlers now call json-storage methods directly for all CRUD operations.
 * Only executeMacro() and validateMacro() are still actively used.
 */

import { EventEmitter } from 'events';
import { BaseElectronService, IMacroService, ServiceConfig } from '@harmonysync/core';

// ==================== Type Definitions ====================

/**
 * Valid macro actions
 */
export type MacroAction = 
  | 'start_preservice_music'
  | 'stop_preservice_music'
  | 'send_midi_note'
  | 'display_black_screen'
  | 'clear_displays';

/**
 * Macro structure
 */
export interface Macro {
  id?: string;
  name: string;
  action: MacroAction;
  options?: MacroOptions;
}

/**
 * Options for macro execution
 */
export interface MacroOptions {
  midiNote?: number;
  velocity?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * MIDI note data
 */
export interface MidiNoteData {
  note: number;
  velocity: number;
  duration: number;
}

// ==================== Macro Service Class ====================

/**
 * Macro Service Implementation
 * Provides macro execution and validation with proper error handling
 */
export class MacroService extends BaseElectronService implements IMacroService {
  protected readonly serviceName = 'MacroService';
  
  // Valid macro actions constant
  private static readonly VALID_ACTIONS: MacroAction[] = [
    'start_preservice_music',
    'stop_preservice_music',
    'send_midi_note',
    'display_black_screen',
    'clear_displays'
  ];
  
  private appHandle: EventEmitter | null = null;
  
  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the macro service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Macro service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.appHandle = null;
    this.log('info', 'Macro service disposed');
  }

  /**
   * Set the application event emitter handle for macro execution
   * @param handle - Event emitter handle from main process
   */
  public setAppHandle(handle: EventEmitter): void {
    this.appHandle = handle;
    this.log('debug', 'App handle set for macro execution');
  }

  // ==================== Public API Methods ====================

  /**
   * Get all macros
   * @returns Promise resolving to array of macros
   */
  public async getAll(): Promise<Macro[]> {
    this.log('debug', 'Getting all macros (deprecated - use json-storage)');
    // Deprecated - actual implementation in IPC handlers
    return [];
  }

  /**
   * Create a new macro
   * @param macro - Macro data
   * @returns Promise resolving to macro ID
   */
  public async create(macro: Macro): Promise<string> {
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
  public async update(id: string, macro: Macro): Promise<void> {
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
  public async delete(id: string): Promise<void> {
    this.log('info', `Deleting macro ${id}`);
    // Deprecated - actual implementation in IPC handlers
  }

  /**
   * Execute a macro
   * @param id - Macro ID
   */
  public async execute(id: string): Promise<void> {
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
  public async executeMacroAction(
    macroId: string,
    macroAction: MacroAction,
    options: MacroOptions = {}
  ): Promise<void> {
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
    } catch (error) {
      this.handleError(`executeMacroAction(${macroId}, ${macroAction})`, error);
    }
  }

  /**
   * Start preservice music
   */
  private executeStartPreserviceMusic(): void {
    if (!this.appHandle) return;
    this.appHandle.emit('main', 'start-preservice-music', {});
    this.log('debug', 'Started preservice music');
  }

  /**
   * Stop preservice music
   */
  private executeStopPreserviceMusic(): void {
    if (!this.appHandle) return;
    this.appHandle.emit('main', 'stop-preservice-music', {});
    this.log('debug', 'Stopped preservice music');
  }

  /**
   * Send MIDI note
   * @param options - MIDI note options
   */
  private executeSendMidiNote(options: MacroOptions): void {
    if (!this.appHandle) return;
    
    if (!options.midiNote) {
      throw new Error('MIDI note value is required for send_midi_note action');
    }
    
    const midiData: MidiNoteData = {
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
  private executeDisplayBlackScreen(): void {
    if (!this.appHandle) return;
    this.appHandle.emit('audience', 'display-black-screen', {});
    this.log('debug', 'Displayed black screen');
  }

  /**
   * Clear all displays
   */
  private executeClearDisplays(): void {
    if (!this.appHandle) return;
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
  public validateMacro(macro: Macro): ValidationResult {
    const errors: string[] = [];
    
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
      } else if (typeof macro.options.midiNote !== 'number' || 
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
  public async getMacroById(_macroId: string): Promise<Macro | null> {
    this.log('warn', 'getMacroById is deprecated - use json-storage directly');
    return null;
  }

  /**
   * Get macros for a specific slide (deprecated)
   * @param _slideId - Slide ID
   * @returns Promise resolving to array of macros
   */
  public async getMacrosForSlide(_slideId: string): Promise<Macro[]> {
    this.log('warn', 'getMacrosForSlide is deprecated - use json-storage directly');
    return [];
  }

  /**
   * Add macro to slide (deprecated)
   * @param _slideId - Slide ID
   * @param _macroId - Macro ID
   */
  public async addMacroToSlide(_slideId: string, _macroId: string): Promise<void> {
    this.log('warn', 'addMacroToSlide is deprecated - use json-storage directly');
  }

  /**
   * Remove macro from slide (deprecated)
   * @param _slideId - Slide ID
   * @param _macroId - Macro ID
   */
  public async removeMacroFromSlide(_slideId: string, _macroId: string): Promise<void> {
    this.log('warn', 'removeMacroFromSlide is deprecated - use json-storage directly');
  }
}

// ==================== Singleton Export ====================

let macroServiceInstance: MacroService | null = null;

/**
 * Get or create the macro service singleton
 */
export function getMacroService(config?: ServiceConfig): MacroService {
  if (!macroServiceInstance) {
    macroServiceInstance = new MacroService(config);
  }
  return macroServiceInstance;
}

// Export for backward compatibility
export default MacroService;
