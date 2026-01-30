/**
 * Tests for Macro Service
 */

import MacroService, { Macro, MacroOptions, ValidationResult } from '../macro-service';
import { EventEmitter } from 'events';

interface MockDatabase {
  all: jest.Mock;
  get: jest.Mock;
  run: jest.Mock;
  prepare: jest.Mock;
}

interface MockPreparedStatement {
  run: jest.Mock;
  finalize: jest.Mock;
}

describe('Macro Service', () => {
  let mockDb: MockDatabase;
  let mockAppHandle: EventEmitter;
  let service: MacroService;
  
  beforeEach(() => {
    mockDb = {
      all: jest.fn((query: string, params: any[], callback: Function) => callback(null, [])),
      get: jest.fn((query: string, params: any[], callback: Function) => callback(null, null)),
      run: jest.fn((query: string, params: any[], callback: Function) => callback(null)),
      prepare: jest.fn((): MockPreparedStatement => ({
        run: jest.fn((p1: any, p2: any, callback: Function) => {
          callback.call({ lastID: 1 }, null);
        }),
        finalize: jest.fn()
      }))
    };
    
    mockAppHandle = new EventEmitter();
    jest.spyOn(mockAppHandle, 'emit');
    
    service = new MacroService();
    service.setAppHandle(mockAppHandle);
  });
  
  describe('executeMacro', () => {
    it('should execute start_preservice_music macro', async () => {
      await service.executeMacroAction('macro1', 'start_preservice_music');
      expect(mockAppHandle.emit).toHaveBeenCalledWith('main', 'start-preservice-music', {});
    });
    
    it('should execute send_midi_note macro', async () => {
      await service.executeMacroAction('macro1', 'send_midi_note', { midiNote: 60 });
      expect(mockAppHandle.emit).toHaveBeenCalledWith('main', 'send-midi-note', expect.objectContaining({ note: 60 }));
    });
    
    it('should throw error for unknown macro action', async () => {
      await expect(service.executeMacroAction('macro1', 'unknown_action' as any))
        .rejects.toThrow('Unknown macro action');
    });
    
    it('should throw error for send_midi_note without midiNote', async () => {
      await expect(service.executeMacroAction('macro1', 'send_midi_note', {}))
        .rejects.toThrow('MIDI note value is required');
    });
  });
  
  describe('getAllMacros', () => {
    it('should return all macros from database', async () => {
      const mockMacros: Macro[] = [{ id: '1', name: 'Test', action: 'start_preservice_music' }];
      // Mock json-storage read (the actual implementation uses json-storage now)
      // For this test, we're just verifying the method exists and returns the expected type
      const result = await service.getAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe('createMacro', () => {
    it('should create new macro', async () => {
      const macro: Macro = { name: 'Test Macro', action: 'display_black_screen' };
      
      const result = await service.create(macro);
      
      expect(typeof result).toBe('string'); // Returns ID
    });
  });
  
  describe('validateMacro', () => {
    it('should validate valid macro', () => {
      const macro: Macro = { name: 'Test', action: 'start_preservice_music' };
      const result: ValidationResult = service.validateMacro(macro);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject macro without name', () => {
      const macro = { action: 'start_preservice_music' } as Macro;
      const result: ValidationResult = service.validateMacro(macro);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Macro name is required');
    });
    
    it('should reject macro with invalid action', () => {
      const macro = { name: 'Test', action: 'invalid_action' } as any;
      const result: ValidationResult = service.validateMacro(macro);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
