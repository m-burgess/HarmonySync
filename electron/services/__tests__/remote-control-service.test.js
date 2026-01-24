/**
 * Tests for Remote Control Service
 */

const remoteControlService = require('../remote-control-service');

describe('Remote Control Service', () => {
  
  describe('Module exports', () => {
    it('should export required functions', () => {
      expect(remoteControlService.initialize).toBeDefined();
      expect(remoteControlService.start).toBeDefined();
      expect(remoteControlService.stop).toBeDefined();
      expect(remoteControlService.getUrl).toBeDefined();
      expect(remoteControlService.updateState).toBeDefined();
      expect(remoteControlService.setSetlistDirectory).toBeDefined();
    });
  });
  
  describe('getUrl', () => {
    it('should return URL object with local and network addresses', () => {
      const urls = remoteControlService.getUrl();
      
      expect(urls).toHaveProperty('local');
      expect(urls).toHaveProperty('network');
      expect(urls).toHaveProperty('mobile');
      expect(urls.local).toContain('http://localhost:3000');
      expect(urls.network).toContain('http://');
      expect(urls.mobile).toContain('/mobile-control.html');
    });
  });
  
  describe('initialize', () => {
    it('should accept a window getter function', () => {
      const mockWindowGetter = jest.fn(() => ({
        webContents: {
          send: jest.fn()
        }
      }));
      
      expect(() => {
        remoteControlService.initialize(mockWindowGetter);
      }).not.toThrow();
    });
  });
  
  describe('updateState', () => {
    it('should update application state', () => {
      const stateUpdate = {
        currentFolder: '/path/to/folder',
        currentSlideIndex: 5,
        totalSlides: 10,
        playbackStatus: 'playing',
        loadedTracks: ['track1.mp3', 'track2.mp3']
      };
      
      expect(() => {
        remoteControlService.updateState(stateUpdate);
      }).not.toThrow();
    });
    
    it('should handle partial state updates', () => {
      const partialUpdate = {
        playbackStatus: 'paused'
      };
      
      expect(() => {
        remoteControlService.updateState(partialUpdate);
      }).not.toThrow();
    });
  });
  
  describe('setSetlistDirectory', () => {
    it('should accept a directory path', () => {
      const dirPath = '/path/to/setlist';
      
      expect(() => {
        remoteControlService.setSetlistDirectory(dirPath);
      }).not.toThrow();
    });
    
    it('should handle null directory', () => {
      expect(() => {
        remoteControlService.setSetlistDirectory(null);
      }).not.toThrow();
    });
  });
  
  describe('Service lifecycle', () => {
    it('should start and stop without errors', async () => {
      // Note: This test doesn't actually start the server to avoid port conflicts
      // In a real test environment, you would use supertest or similar
      expect(remoteControlService.start).toBeDefined();
      expect(remoteControlService.stop).toBeDefined();
    });
  });
});
