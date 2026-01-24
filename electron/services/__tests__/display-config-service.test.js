/**
 * Tests for Display Configuration Service
 */

const fs = require('fs-extra');
const path = require('path');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path')
  }
}));

const displayConfigService = require('../display-config-service');

describe('Display Configuration Service', () => {
  const mockSettingsPath = '/mock/path/settings';
  const mockConfigPath = path.join(mockSettingsPath, 'display_configs.json');
  
  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs operations
    fs.ensureDir = jest.fn();
    fs.pathExists = jest.fn();
    fs.readJson = jest.fn();
    fs.writeJson = jest.fn();
  });
  
  describe('initialize', () => {
    it('should create default displays if config does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      
      await displayConfigService.initialize();
      
      expect(fs.ensureDir).toHaveBeenCalledWith(mockSettingsPath);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should load existing displays if config exists', async () => {
      const mockConfig = {
        displays: [
          { id: 'test-1', name: 'Test Display', type: 'custom', enabled: true }
        ]
      };
      
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue(mockConfig);
      
      await displayConfigService.initialize();
      
      const configs = displayConfigService.getAllDisplayConfigs();
      expect(configs).toHaveLength(1);
      expect(configs[0].name).toBe('Test Display');
    });
  });
  
  describe('getAllDisplayConfigs', () => {
    it('should return all display configurations', async () => {
      fs.pathExists.mockResolvedValue(false);
      await displayConfigService.initialize();
      
      const configs = displayConfigService.getAllDisplayConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('id');
      expect(configs[0]).toHaveProperty('name');
      expect(configs[0]).toHaveProperty('type');
    });
  });
  
  describe('createDisplayConfig', () => {
    it('should create a new display configuration', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      await displayConfigService.initialize();
      
      const newConfig = {
        name: 'LED Wall',
        type: 'graphics',
        deviceId: '123',
        enabled: true
      };
      
      const created = await displayConfigService.createDisplayConfig(newConfig);
      
      expect(created).toHaveProperty('id');
      expect(created.name).toBe('LED Wall');
      expect(created.type).toBe('graphics');
      expect(fs.writeJson).toHaveBeenCalled();
    });
  });
  
  describe('updateDisplayConfig', () => {
    it('should update an existing display configuration', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      await displayConfigService.initialize();
      
      const configs = displayConfigService.getAllDisplayConfigs();
      const firstId = configs[0].id;
      
      const updated = await displayConfigService.updateDisplayConfig(firstId, {
        name: 'Updated Name'
      });
      
      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(firstId);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should throw error if display not found', async () => {
      fs.pathExists.mockResolvedValue(false);
      await displayConfigService.initialize();
      
      await expect(
        displayConfigService.updateDisplayConfig('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Display configuration not found');
    });
  });
  
  describe('deleteDisplayConfig', () => {
    it('should delete a display configuration', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      await displayConfigService.initialize();
      
      const configs = displayConfigService.getAllDisplayConfigs();
      const initialCount = configs.length;
      const firstId = configs[0].id;
      
      await displayConfigService.deleteDisplayConfig(firstId);
      
      const newConfigs = displayConfigService.getAllDisplayConfigs();
      expect(newConfigs.length).toBe(initialCount - 1);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should throw error if display not found', async () => {
      fs.pathExists.mockResolvedValue(false);
      await displayConfigService.initialize();
      
      await expect(
        displayConfigService.deleteDisplayConfig('nonexistent')
      ).rejects.toThrow('Display configuration not found');
    });
  });
  
  describe('getEnabledDisplayConfigs', () => {
    it('should return only enabled displays', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      await displayConfigService.initialize();
      
      // Create a disabled display
      await displayConfigService.createDisplayConfig({
        name: 'Disabled Display',
        type: 'custom',
        enabled: false
      });
      
      const enabled = displayConfigService.getEnabledDisplayConfigs();
      expect(enabled.every(d => d.enabled)).toBe(true);
    });
    
    it('should return displays sorted by order', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.writeJson.mockResolvedValue();
      await displayConfigService.initialize();
      
      const enabled = displayConfigService.getEnabledDisplayConfigs();
      
      for (let i = 1; i < enabled.length; i++) {
        expect(enabled[i].order).toBeGreaterThanOrEqual(enabled[i - 1].order);
      }
    });
  });
});

module.exports = {};
