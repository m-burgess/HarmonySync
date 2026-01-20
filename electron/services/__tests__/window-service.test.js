/**
 * Tests for Window Service
 */

const windowService = require('../window-service');

describe('Window Service', () => {
  let mockWindow;
  
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
  });
  
  describe('showAudienceWindow', () => {
    it('should call show on window', async () => {
      const getWindow = () => mockWindow;
      await windowService.showAudienceWindow(getWindow);
      expect(mockWindow.show).toHaveBeenCalled();
    });
    
    it('should handle null window', async () => {
      const getWindow = () => null;
      await expect(windowService.showAudienceWindow(getWindow)).resolves.not.toThrow();
    });
  });
  
  describe('hideAudienceWindow', () => {
    it('should call hide on window', async () => {
      const getWindow = () => mockWindow;
      await windowService.hideAudienceWindow(getWindow);
      expect(mockWindow.hide).toHaveBeenCalled();
    });
  });
  
  describe('toggleWindow', () => {
    it('should hide visible window', async () => {
      mockWindow.isVisible.mockReturnValue(true);
      const getWindow = () => mockWindow;
      
      const result = await windowService.toggleWindow(getWindow);
      
      expect(mockWindow.hide).toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should show hidden window', async () => {
      mockWindow.isVisible.mockReturnValue(false);
      const getWindow = () => mockWindow;
      
      const result = await windowService.toggleWindow(getWindow);
      
      expect(mockWindow.show).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('maximizeWindow', () => {
    it('should maximize window when not maximized', async () => {
      mockWindow.isMaximized.mockReturnValue(false);
      const getWindow = () => mockWindow;
      
      await windowService.maximizeWindow(getWindow);
      
      expect(mockWindow.maximize).toHaveBeenCalled();
    });
    
    it('should unmaximize window when maximized', async () => {
      mockWindow.isMaximized.mockReturnValue(true);
      const getWindow = () => mockWindow;
      
      await windowService.maximizeWindow(getWindow);
      
      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });
  });
  
  describe('setAlwaysOnTop', () => {
    it('should set window always on top', async () => {
      const getWindow = () => mockWindow;
      
      await windowService.setAlwaysOnTop(getWindow, true);
      
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });
  });
  
  describe('isWindowVisible', () => {
    it('should return visibility status', async () => {
      mockWindow.isVisible.mockReturnValue(true);
      const getWindow = () => mockWindow;
      
      const result = await windowService.isWindowVisible(getWindow);
      
      expect(result).toBe(true);
    });
    
    it('should return false for null window', async () => {
      const getWindow = () => null;
      
      const result = await windowService.isWindowVisible(getWindow);
      
      expect(result).toBe(false);
    });
  });
  
  describe('getAllWindowsStatus', () => {
    it('should return status of all windows', async () => {
      const getWindow = () => mockWindow;
      
      const status = await windowService.getAllWindowsStatus(getWindow, getWindow, getWindow);
      
      expect(status).toHaveProperty('audience');
      expect(status).toHaveProperty('confidence');
      expect(status).toHaveProperty('lowerThirds');
      expect(status.audience.visible).toBe(true);
      expect(status.audience.exists).toBe(true);
    });
  });
});

module.exports = {};
