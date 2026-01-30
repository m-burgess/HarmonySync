/**
 * Tests for Window Service
 */

import { BrowserWindow } from 'electron';
import WindowService from '../window-service';

type WindowGetter = () => BrowserWindow | null;

interface MockWindow {
  show: jest.Mock;
  hide: jest.Mock;
  focus: jest.Mock;
  minimize: jest.Mock;
  maximize: jest.Mock;
  unmaximize: jest.Mock;
  setAlwaysOnTop: jest.Mock;
  isVisible: jest.Mock;
  isMaximized: jest.Mock;
}

interface WindowStatus {
  audience: {
    visible: boolean;
    exists: boolean;
  };
  confidence: {
    visible: boolean;
    exists: boolean;
  };
  lowerThirds: {
    visible: boolean;
    exists: boolean;
  };
}

describe('Window Service', () => {
  let mockWindow: MockWindow;
  let service: WindowService;
  
  beforeEach(() => {
    mockWindow = {
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      minimize: jest.fn(),
      maximize: jest.fn(),
      unmaximize: jest.fn(),
      setAlwaysOnTop: jest.fn(),
      isVisible: jest.fn().mockReturnValue(true),
      isMaximized: jest.fn().mockReturnValue(false)
    };
    
    service = new WindowService();
    const getWindow: WindowGetter = () => mockWindow as any;
    service.registerWindowGetters(getWindow, getWindow, getWindow);
  });
  
  describe('showAudienceWindow', () => {
    it('should call show on window', async () => {
      await service.showAudience();
      expect(mockWindow.show).toHaveBeenCalled();
    });
    
    it('should handle null window', async () => {
      const serviceWithNull = new WindowService();
      const getNull: WindowGetter = () => null;
      serviceWithNull.registerWindowGetters(getNull, getNull, getNull);
      await expect(serviceWithNull.showAudience()).resolves.not.toThrow();
    });
  });
  
  describe('hideAudienceWindow', () => {
    it('should call hide on window', async () => {
      await service.hideAudience();
      expect(mockWindow.hide).toHaveBeenCalled();
    });
  });
  
  describe('toggleWindow', () => {
    it('should hide visible window', async () => {
      mockWindow.isVisible.mockReturnValue(true);
      
      const result: boolean = await service.toggleWindow('audience');
      
      expect(mockWindow.hide).toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should show hidden window', async () => {
      mockWindow.isVisible.mockReturnValue(false);
      
      const result: boolean = await service.toggleWindow('audience');
      
      expect(mockWindow.show).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('maximizeWindow', () => {
    it('should maximize window when not maximized', async () => {
      mockWindow.isMaximized.mockReturnValue(false);
      
      await service.maximizeWindow('audience');
      
      expect(mockWindow.maximize).toHaveBeenCalled();
    });
    
    it('should unmaximize window when maximized', async () => {
      mockWindow.isMaximized.mockReturnValue(true);
      
      await service.maximizeWindow('audience');
      
      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });
  });
  
  describe('setAlwaysOnTop', () => {
    it('should set window always on top', async () => {
      await service.setAlwaysOnTop('audience', true);
      
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });
  });
  
  describe('isWindowVisible', () => {
    it('should return visibility status', async () => {
      mockWindow.isVisible.mockReturnValue(true);
      
      const result: boolean = await service.isWindowVisible('audience');
      
      expect(result).toBe(true);
    });
    
    it('should return false for null window', async () => {
      const serviceWithNull = new WindowService();
      const getNull: WindowGetter = () => null;
      serviceWithNull.registerWindowGetters(getNull, getNull, getNull);
      
      const result: boolean = await serviceWithNull.isWindowVisible('audience');
      
      expect(result).toBe(false);
    });
  });
  
  describe('getAllWindowsStatus', () => {
    it('should return status of all windows', async () => {
      const status: WindowStatus = await service.getAllWindowsStatus();
      
      expect(status).toHaveProperty('audience');
      expect(status).toHaveProperty('confidence');
      expect(status).toHaveProperty('lowerThirds');
      expect(status.audience.visible).toBe(true);
      expect(status.audience.exists).toBe(true);
    });
  });
});
