/**
 * Tests for Display Configuration Service
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { DisplayConfig } from '../../types/models';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path')
  }
}));

// Import after mocking electron
import DisplayConfigService from '../display-config-service';

describe('Display Configuration Service', () => {
  const mockSettingsPath = '/mock/path/settings';
  const mockConfigPath = path.join(mockSettingsPath, 'display_configs.json');
  let service: DisplayConfigService;
  
  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs operations
    (fs.ensureDir as jest.Mock) = jest.fn();
    (fs.pathExists as jest.Mock) = jest.fn();
    (fs.readJson as jest.Mock) = jest.fn();
    (fs.writeJson as jest.Mock) = jest.fn();
    
    // Create a new service instance for each test
    service = new DisplayConfigService();
  });
  
  describe('initialize', () => {
    it('should create default displays if config does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      
      await service.initialize();
      
      expect(fs.ensureDir).toHaveBeenCalledWith(mockSettingsPath);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should load existing displays if config exists', async () => {
      const mockConfig = {
        displays: [
          { id: 'test-1', name: 'Test Display', type: 'custom', enabled: true }
        ] as DisplayConfig[]
      };
      
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockConfig);
      
      await service.initialize();
      
      const configs = service.getAllDisplayConfigs();
      expect(configs).toHaveLength(1);
      expect(configs[0].name).toBe('Test Display');
    });
  });
  
  describe('getAllDisplayConfigs', () => {
    it('should return all display configurations', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      await service.initialize();
      
      const configs = service.getAllDisplayConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('id');
      expect(configs[0]).toHaveProperty('name');
      expect(configs[0]).toHaveProperty('type');
    });
  });
  
  describe('createDisplayConfig', () => {
    it('should create a new display configuration', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      await service.initialize();
      
      const newConfig: Partial<DisplayConfig> = {
        name: 'LED Wall',
        type: 'graphics',
        enabled: true
      };
      
      const created = await service.createDisplayConfig(newConfig);
      
      expect(created).toHaveProperty('id');
      expect(created.name).toBe('LED Wall');
      expect(created.type).toBe('graphics');
      expect(fs.writeJson).toHaveBeenCalled();
    });
  });
  
  describe('updateDisplayConfig', () => {
    it('should update an existing display configuration', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      await service.initialize();
      
      const configs = service.getAllDisplayConfigs();
      const firstId = configs[0].id;
      
      const updated = await service.updateDisplayConfig(firstId, {
        name: 'Updated Name'
      });
      
      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(firstId);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should throw error if display not found', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      await service.initialize();
      
      await expect(
        service.updateDisplayConfig('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Display configuration not found');
    });
  });
  
  describe('deleteDisplayConfig', () => {
    it('should delete a display configuration', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      await service.initialize();
      
      const configs = service.getAllDisplayConfigs();
      const initialCount = configs.length;
      const firstId = configs[0].id;
      
      await service.deleteDisplayConfig(firstId);
      
      const newConfigs = service.getAllDisplayConfigs();
      expect(newConfigs.length).toBe(initialCount - 1);
      expect(fs.writeJson).toHaveBeenCalled();
    });
    
    it('should throw error if display not found', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      await service.initialize();
      
      await expect(
        service.deleteDisplayConfig('nonexistent')
      ).rejects.toThrow('Display configuration not found');
    });
  });
  
  describe('getEnabledDisplayConfigs', () => {
    it('should return only enabled displays', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      await service.initialize();
      
      // Create a disabled display
      await service.createDisplayConfig({
        name: 'Disabled Display',
        type: 'custom',
        enabled: false
      });
      
      const enabled = service.getEnabledDisplayConfigs();
      expect(enabled.every((d: DisplayConfig) => d.enabled)).toBe(true);
    });
    
    it('should return displays sorted by order', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      await service.initialize();
      
      const enabled = service.getEnabledDisplayConfigs();
      
      for (let i = 1; i < enabled.length; i++) {
        expect(enabled[i].order).toBeGreaterThanOrEqual(enabled[i - 1].order);
      }
    });
  });
});
