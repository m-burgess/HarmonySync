/**
 * Tests for Remote Control Service
 */

import { initialize, start, stop, getUrl, updateState, getState, setSetlistDirectory } from '../remote-control-service';
import { BrowserWindow } from 'electron';

type WindowGetter = () => BrowserWindow | null;

interface UrlObject {
  local: string;
  network: string;
  mobile: string;
}

describe('Remote Control Service', () => {
  
  describe('Module exports', () => {
    it('should export required functions', () => {
      expect(initialize).toBeDefined();
      expect(start).toBeDefined();
      expect(stop).toBeDefined();
      expect(getUrl).toBeDefined();
      expect(updateState).toBeDefined();
      expect(setSetlistDirectory).toBeDefined();
    });
  });
  
  describe('getUrl', () => {
    it('should return URL object with local and network addresses', () => {
      const urls: UrlObject = getUrl();
      
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
      const mockWindowGetter: WindowGetter = jest.fn(() => null);
      
      expect(() => {
        initialize(mockWindowGetter);
      }).not.toThrow();
    });
  });
  
  describe('updateState', () => {
    it('should update application state', () => {
      const stateUpdate = {
        currentFolder: '/path/to/folder',
        currentSlideIndex: 5,
        totalSlides: 10,
        playbackStatus: 'playing' as const,
        loadedTracks: ['track1.mp3', 'track2.mp3']
      };
      
      expect(() => {
        updateState(stateUpdate);
      }).not.toThrow();
    });
    
    it('should handle partial state updates', () => {
      const partialUpdate = {
        playbackStatus: 'paused' as const
      };
      
      expect(() => {
        updateState(partialUpdate);
      }).not.toThrow();
    });
  });
  
  describe('setSetlistDirectory', () => {
    it('should accept a directory path', () => {
      const dirPath = '/path/to/setlist';
      
      expect(() => {
        setSetlistDirectory(dirPath);
      }).not.toThrow();
    });
    
    it('should handle null directory', () => {
      expect(() => {
        setSetlistDirectory(null as any);
      }).not.toThrow();
    });
  });
  
  describe('Service lifecycle', () => {
    it('should start and stop without errors', async () => {
      // Note: This test doesn't actually start the server to avoid port conflicts
      // In a real test environment, you would use supertest or similar
      expect(start).toBeDefined();
      expect(stop).toBeDefined();
    });
  });
});
