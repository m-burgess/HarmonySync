/**
 * Tests for Display Service
 */

const displayService = require('../display-service');

describe('Display Service', () => {
  let mockAudienceWindow;
  let mockConfidenceWindow;
  let mockLowerThirdsWindow;
  
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
  });
  
  describe('displayVideoSlide', () => {
    it('should send video slide to audience window', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      
      await displayService.displayVideoSlide(getAudience, getConfidence, '/path/to/video.mp4', 120);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-video-slide', '/path/to/video.mp4');
    });
    
    it('should send countdown to confidence window', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      
      await displayService.displayVideoSlide(getAudience, getConfidence, '/path/to/video.mp4', 120);
      
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('start-video-countdown', 120);
    });
    
    it('should handle null windows gracefully', async () => {
      const getAudience = () => null;
      const getConfidence = () => null;
      
      await expect(displayService.displayVideoSlide(getAudience, getConfidence, '/path/to/video.mp4', 120))
        .resolves.not.toThrow();
    });
  });
  
  describe('displaySlide', () => {
    it('should send slide content to all windows', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      const getLowerThirds = () => mockLowerThirdsWindow;
      
      const content = { text: 'Test Slide', lowerThirds: { line1: 'Test', line2: 'Line' } };
      
      await displayService.displaySlide(getAudience, getConfidence, getLowerThirds, content);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-slide', content);
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('display-slide', content);
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('update-lower-thirds', content.lowerThirds);
    });
    
    it('should not send to lower thirds if no lower thirds content', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      const getLowerThirds = () => mockLowerThirdsWindow;
      
      const content = { text: 'Test Slide' };
      
      await displayService.displaySlide(getAudience, getConfidence, getLowerThirds, content);
      
      expect(mockLowerThirdsWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
  
  describe('displayBlackScreen', () => {
    it('should send black screen command to audience window', async () => {
      const getAudience = () => mockAudienceWindow;
      
      await displayService.displayBlackScreen(getAudience);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('display-black-screen');
    });
  });
  
  describe('clearAllDisplays', () => {
    it('should clear all display windows', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      const getLowerThirds = () => mockLowerThirdsWindow;
      
      await displayService.clearAllDisplays(getAudience, getConfidence, getLowerThirds);
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('clear-display');
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('clear-display');
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('clear-display');
    });
  });
  
  describe('broadcastToAllDisplays', () => {
    it('should broadcast message to all displays', async () => {
      const getAudience = () => mockAudienceWindow;
      const getConfidence = () => mockConfidenceWindow;
      const getLowerThirds = () => mockLowerThirdsWindow;
      
      await displayService.broadcastToAllDisplays(getAudience, getConfidence, getLowerThirds, 'test-channel', { data: 'test' });
      
      expect(mockAudienceWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
      expect(mockConfidenceWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
      expect(mockLowerThirdsWindow.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
    });
  });
});

module.exports = {};
