/**
 * Tests for Macro Service
 */

const macroService = require('../macro-service');

describe('Macro Service', () => {
  let mockDb;
  let mockAppHandle;
  
  beforeEach(() => {
    mockDb = {
      all: jest.fn((query, params, callback) => callback(null, [])),
      get: jest.fn((query, params, callback) => callback(null, null)),
      run: jest.fn((query, params, callback) => callback(null)),
      prepare: jest.fn(() => ({
        run: jest.fn((p1, p2, callback) => {
          callback.call({ lastID: 1 }, null);
        }),
        finalize: jest.fn()
      }))
    };
    
    mockAppHandle = {
      emit: jest.fn()
    };
  });
  
  describe('executeMacro', () => {
    it('should execute start_preservice_music macro', async () => {
      await macroService.executeMacro(mockAppHandle, 'macro1', 'start_preservice_music');
      expect(mockAppHandle.emit).toHaveBeenCalledWith('main', 'start-preservice-music', {});
    });
    
    it('should execute send_midi_note macro', async () => {
      await macroService.executeMacro(mockAppHandle, 'macro1', 'send_midi_note', { midiNote: 60 });
      expect(mockAppHandle.emit).toHaveBeenCalledWith('main', 'send-midi-note', expect.objectContaining({ note: 60 }));
    });
    
    it('should throw error for unknown macro action', async () => {
      await expect(macroService.executeMacro(mockAppHandle, 'macro1', 'unknown_action'))
        .rejects.toThrow('Unknown macro action');
    });
    
    it('should throw error for send_midi_note without midiNote', async () => {
      await expect(macroService.executeMacro(mockAppHandle, 'macro1', 'send_midi_note', {}))
        .rejects.toThrow('MIDI note value is required');
    });
  });
  
  describe('getAllMacros', () => {
    it('should return all macros from database', async () => {
      const mockMacros = [{ id: 1, name: 'Test', action: 'start_preservice_music' }];
      mockDb.all.mockImplementation((query, params, callback) => callback(null, mockMacros));
      
      const result = await macroService.getAllMacros(mockDb);
      
      expect(result).toEqual(mockMacros);
    });
  });
  
  describe('createMacro', () => {
    it('should create new macro', async () => {
      const macro = { name: 'Test Macro', action: 'display_black_screen' };
      
      const result = await macroService.createMacro(mockDb, macro);
      
      expect(result).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
  
  describe('validateMacro', () => {
    it('should validate valid macro', () => {
      const macro = { name: 'Test', action: 'start_preservice_music' };
      const result = macroService.validateMacro(macro);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject macro without name', () => {
      const macro = { action: 'start_preservice_music' };
      const result = macroService.validateMacro(macro);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Macro name is required');
    });
    
    it('should reject macro with invalid action', () => {
      const macro = { name: 'Test', action: 'invalid_action' };
      const result = macroService.validateMacro(macro);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

module.exports = {};
