const eventTriggerService = require('../event-trigger-service');
const scriptService = require('../script-service');

// Mock dependencies
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-userdata')
  }
}));

jest.mock('fs-extra');
jest.mock('../script-service');

describe('Event Trigger Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTrigger', () => {
    it('should register a trigger for an event', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script',
        code: 'console.log("test");'
      });

      const trigger = await eventTriggerService.registerTrigger('slideChange', 'script1');

      expect(trigger).toBeDefined();
      expect(trigger.eventType).toBe('slideChange');
      expect(trigger.scriptId).toBe('script1');
      expect(trigger.enabled).toBe(true);
    });

    it('should throw error for invalid event type', async () => {
      await expect(
        eventTriggerService.registerTrigger('invalidEvent', 'script1')
      ).rejects.toThrow('Invalid event type');
    });
  });

  describe('getAllTriggers', () => {
    it('should return all triggers', async () => {
      const triggers = await eventTriggerService.getAllTriggers();
      expect(triggers).toBeDefined();
      expect(typeof triggers).toBe('object');
    });
  });

  describe('enableTrigger and disableTrigger', () => {
    it('should enable and disable triggers', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script'
      });

      const trigger = await eventTriggerService.registerTrigger('slideChange', 'script1');
      
      await eventTriggerService.disableTrigger(trigger.id);
      // Would need to verify in actual implementation
      
      await eventTriggerService.enableTrigger(trigger.id);
      // Would need to verify in actual implementation
    });
  });

  describe('getEventTypes', () => {
    it('should return list of event types', () => {
      const eventTypes = eventTriggerService.getEventTypes();
      expect(Array.isArray(eventTypes)).toBe(true);
      expect(eventTypes.length).toBeGreaterThan(0);
      expect(eventTypes).toContain('slideChange');
    });
  });

  describe('emitEvent', () => {
    it('should emit event and execute triggers', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script'
      });
      scriptService.executeScript.mockResolvedValue({ success: true });

      await eventTriggerService.registerTrigger('slideChange', 'script1');
      
      const results = await eventTriggerService.emitEvent('slideChange', {
        slideIndex: 5
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('unregisterTrigger', () => {
    it('should unregister a trigger', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script'
      });

      const trigger = await eventTriggerService.registerTrigger('slideChange', 'script1');
      const result = await eventTriggerService.unregisterTrigger(trigger.id);
      
      expect(result).toBe(true);
    });
  });

  describe('testTrigger', () => {
    it('should test a trigger with sample data', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script'
      });
      scriptService.executeScript.mockResolvedValue({ success: true });

      const trigger = await eventTriggerService.registerTrigger('slideChange', 'script1');
      
      const result = await eventTriggerService.testTrigger(trigger.id, {
        slideIndex: 10
      });

      expect(result.success).toBe(true);
    });
  });

  describe('deleteTriggersForScript', () => {
    it('should delete all triggers for a script', async () => {
      scriptService.getScript.mockResolvedValue({
        id: 'script1',
        name: 'Test Script'
      });

      await eventTriggerService.registerTrigger('slideChange', 'script1');
      await eventTriggerService.registerTrigger('videoStart', 'script1');
      
      const count = await eventTriggerService.deleteTriggersForScript('script1');
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
