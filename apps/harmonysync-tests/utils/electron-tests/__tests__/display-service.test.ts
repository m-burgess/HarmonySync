/**
 * Tests for Display Service
 */

import { BrowserWindow } from 'electron';
import DisplayService from '../display-service';

type WindowGetter = () => BrowserWindow | null;

interface MockWebContents {
  send: jest.Mock;
}

interface MockWindow {
  webContents: MockWebContents;
}

describe('Display Service', () => {
  let mockAudienceWindow: MockWindow;
  let mockConfidenceWindow: MockWindow;
  let mockLowerThirdsWindow: MockWindow;
  let service: DisplayService;
  
  beforeEach(() => {
    mockAudienceWindow = {
      webContents: {
        send: jest.fn()
      }
    };
    
    mockConfidenceWindow = {
      webContents: {
        send: jest.fn()
      }
    };
    
    mockLowerThirdsWindow = {
      webContents: {
        send: jest.fn()
      }
    };
    
    // Create service instance with window getters
    const getAudience: WindowGetter = () => mockAudienceWindow as any;
    const getConfidence: WindowGetter = () => mockConfidenceWindow as any;
    const getLowerThirds: WindowGetter = () => mockLowerThirdsWindow as any;
    
    service = new DisplayService(getAudience, getConfidence, getLowerThirds);
  });
  
  describe('displayVideoSlide', () => {
    it('should send video slide to audience window', async () => {
      await service.displayVideoSlide('/path/to/video.mp4', 120);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-video-slide', '/path/to/video.mp4');
    });
    
    it('should send countdown to confidence window', async () => {
      await service.displayVideoSlide('/path/to/video.mp4', 120);
      
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('start-video-countdown', 120);
    });
    
    it('should handle null windows gracefully', async () => {
      const nullService = new DisplayService(() => null, () => null, () => null);
      
      await expect(nullService.displayVideoSlide('/path/to/video.mp4', 120))
        .resolves.not.toThrow();
    });
  });
  
  describe('displaySlide', () => {
    it('should send slide content to all windows', async () => {
      const content = { text: 'Test Slide', lowerThirds: { line1: 'Test', line2: 'Line' } };
      
      await service.displaySlide(content);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-slide', content);
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('display-slide', content);
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('update-lower-thirds', content.lowerThirds);
    });
    
    it('should not send to lower thirds if no lower thirds content', async () => {
      const content = { text: 'Test Slide' };
      
      await service.displaySlide(content);
      
      expect(mockLowerThirdsWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
  
  describe('displayBlackScreen', () => {
    it('should send black screen command to audience window', async () => {
      await service.displayBlackScreen();
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-black-screen');
    });
  });
  
  describe('clearAllDisplays', () => {
    it('should clear all display windows', async () => {
      await service.clearAllDisplays();
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('clear-display');
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('clear-display');
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('clear-display');
    });
  });
  
  describe('broadcastToAllDisplays', () => {
    it('should broadcast message to all displays', async () => {
      await service.broadcastToAllDisplays('test-channel', { data: 'test' });
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
    });
  });
});
