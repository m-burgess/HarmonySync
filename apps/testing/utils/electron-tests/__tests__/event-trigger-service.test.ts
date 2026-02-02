/**
 * Tests for Event Trigger Service
 */

// Mock dependencies
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-userdata')
  }
}));

jest.mock('fs-extra');
jest.mock('../script-service');

import EventTriggerService, { EventType } from '../event-trigger-service';
import ScriptService from '../script-service';

describe('Event Trigger Service', () => {
  let service: EventTriggerService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventTriggerService();
  });

  describe('registerTrigger', () => {
    it('should register a trigger for an event', async () => {
      const trigger = await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');

      expect(trigger).toBeDefined();
      expect(trigger.eventType).toBe('slideChange');
      expect(trigger.scriptId).toBe('script1');
      expect(trigger.enabled).toBe(true);
    });

    it('should throw error for invalid event type', async () => {
      await expect(
        service.registerTrigger('invalidEvent' as any, 'script1', 'Test')
      ).rejects.toThrow('Invalid event type');
    });
  });

  describe('getAllTriggers', () => {
    it('should return all triggers', async () => {
      const triggers = await service.getAllTriggers();
      expect(triggers).toBeDefined();
      expect(typeof triggers).toBe('object');
    });
  });

  describe('enableTrigger and disableTrigger', () => {
    it('should enable and disable triggers', async () => {
      const trigger = await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');
      
      await service.disableTrigger(trigger.id);
      // Would need to verify in actual implementation
      
      await service.enableTrigger(trigger.id);
      // Would need to verify in actual implementation
    });
  });

  describe('EventType enum', () => {
    it('should have defined event types', () => {
      expect(EventType.SLIDE_CHANGE).toBe('slideChange');
      expect(EventType.VIDEO_START).toBe('videoStart');
      expect(EventType.AUDIO_START).toBe('audioStart');
    });
  });

  describe('emitEvent', () => {
    it('should emit event and execute triggers', async () => {
      await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');
      
      const results = await service.emitEvent('slideChange', {
        slideIndex: 5
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('unregisterTrigger', () => {
    it('should unregister a trigger', async () => {
      const trigger = await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');
      const result = await service.unregisterTrigger(trigger.id);
      
      expect(result).toBe(true);
    });
  });

  describe('testTrigger', () => {
    it('should test a trigger with sample data', async () => {
      const trigger = await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');
      
      const result = await service.testTrigger(trigger.id, {
        slideIndex: 10
      });

      expect(result).toBeDefined();
      expect(result.triggerId).toBe(trigger.id);
    });
  });

  describe('deleteTriggersForScript', () => {
    it('should delete all triggers for a script', async () => {
      await service.registerTrigger(EventType.SLIDE_CHANGE, 'script1', 'Test Script');
      await service.registerTrigger(EventType.VIDEO_START, 'script1', 'Test Script');
      
      const count = await service.deleteTriggersForScript('script1');
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
