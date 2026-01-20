/**
 * Tests for DMX Service
 */

const dmxService = require('../dmx-service');

describe('DMX Service', () => {
  let mockDb;
  
  beforeEach(() => {
    mockDb = {
      all: jest.fn((query, params, callback) => callback(null, [])),
      get: jest.fn((query, params, callback) => callback(null, null)),
      run: jest.fn((query, params, callback) => callback(null)),
      prepare: jest.fn(() => ({
        run: jest.fn((p1, p2, p3, p4, p5, p6, p7, callback) => {
          callback.call({ lastID: 1 }, null);
        }),
        finalize: jest.fn()
      }))
    };
  });
  
  describe('addFixture', () => {
    it('should add new fixture', async () => {
      const fixture = {
        id: 'fixture1',
        name: 'Test Fixture',
        fixture_type: 'led_par',
        dmx_address: 1,
        universe: 0,
        channel_count: 7,
        channel_definitions: '{}'
      };
      
      const result = await dmxService.addFixture(mockDb, fixture);
      
      expect(result).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
  
  describe('validateFixture', () => {
    it('should validate valid fixture', () => {
      const fixture = {
        name: 'Test Fixture',
        fixture_type: 'led_par',
        dmx_address: 1,
        universe: 0,
        channel_count: 7
      };
      
      const result = dmxService.validateFixture(fixture);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject fixture without name', () => {
      const fixture = {
        fixture_type: 'led_par',
        dmx_address: 1,
        universe: 0,
        channel_count: 7
      };
      
      const result = dmxService.validateFixture(fixture);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fixture name is required');
    });
    
    it('should reject fixture with invalid DMX address', () => {
      const fixture = {
        name: 'Test',
        fixture_type: 'led_par',
        dmx_address: 600, // Invalid: > 512
        universe: 0,
        channel_count: 7
      };
      
      const result = dmxService.validateFixture(fixture);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should reject fixture with negative channel count', () => {
      const fixture = {
        name: 'Test',
        fixture_type: 'led_par',
        dmx_address: 1,
        universe: 0,
        channel_count: -1
      };
      
      const result = dmxService.validateFixture(fixture);
      
      expect(result.valid).toBe(false);
    });
  });
  
  describe('createScene', () => {
    it('should create new scene', async () => {
      const scene = {
        id: 'scene1',
        name: 'Test Scene',
        description: 'A test scene',
        fade_time_ms: 1000,
        scene_data: '{}'
      };
      
      const result = await dmxService.createScene(mockDb, scene);
      
      expect(result).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
  
  describe('parseSceneData', () => {
    it('should parse valid JSON', () => {
      const sceneData = '{"fixture1": {"dimmer": 255}}';
      const result = dmxService.parseSceneData(sceneData);
      
      expect(result).toEqual({ fixture1: { dimmer: 255 } });
    });
    
    it('should handle invalid JSON gracefully', () => {
      const sceneData = 'invalid json';
      const result = dmxService.parseSceneData(sceneData);
      
      expect(result).toEqual({});
    });
  });
  
  describe('recallScene', () => {
    it('should recall existing scene', async () => {
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        fade_time_ms: 1000,
        scene_data: '{}'
      };
      
      mockDb.get.mockImplementation((query, params, callback) => callback(null, mockScene));
      
      const result = await dmxService.recallScene(mockDb, 'scene1');
      
      expect(result).toEqual(mockScene);
    });
    
    it('should throw error for non-existent scene', async () => {
      mockDb.get.mockImplementation((query, params, callback) => callback(null, null));
      
      await expect(dmxService.recallScene(mockDb, 'nonexistent'))
        .rejects.toThrow('Scene with ID nonexistent not found');
    });
  });
});

module.exports = {};
