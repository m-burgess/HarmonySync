/**
 * Tests for Scheduler Service
 */

const schedulerService = require('../scheduler-service');

describe('Scheduler Service', () => {
  let mockDb;
  
  beforeEach(() => {
    mockDb = {
      all: jest.fn((query, params, callback) => callback(null, [])),
      get: jest.fn((query, params, callback) => callback(null, null)),
      run: jest.fn((query, params, callback) => callback(null)),
      prepare: jest.fn(() => ({
        run: jest.fn((p1, p2, p3, callback) => {
          callback.call({ lastID: 1 }, null);
        }),
        finalize: jest.fn()
      }))
    };
  });
  
  describe('createScheduledEvent', () => {
    it('should create new scheduled event', async () => {
      const event = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = await schedulerService.createScheduledEvent(mockDb, event);
      
      expect(result).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
  
  describe('shouldExecuteNow', () => {
    it('should return true for events within tolerance', () => {
      const event = {
        event_time: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      };
      
      const result = schedulerService.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(false); // Not past yet
    });
    
    it('should return true for past events within tolerance', () => {
      const event = {
        event_time: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      };
      
      const result = schedulerService.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(true);
    });
    
    it('should return false for events outside tolerance', () => {
      const event = {
        event_time: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
      };
      
      const result = schedulerService.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(false);
    });
  });
  
  describe('parseEventTime', () => {
    it('should parse ISO format', () => {
      const timeString = '2026-01-20T10:00:00Z';
      const result = schedulerService.parseEventTime(timeString);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });
    
    it('should parse HH:MM format', () => {
      const timeString = '10:00';
      const result = schedulerService.parseEventTime(timeString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(0);
    });
  });
  
  describe('formatEventForDisplay', () => {
    it('should format event for display', () => {
      const event = {
        id: 1,
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = schedulerService.formatEventForDisplay(event);
      
      expect(result).toHaveProperty('formatted_time');
      expect(result).toHaveProperty('formatted_date');
      expect(result).toHaveProperty('is_past');
    });
  });
  
  describe('validateScheduledEvent', () => {
    it('should validate valid event', () => {
      const event = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = schedulerService.validateScheduledEvent(event);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject event without time', () => {
      const event = {
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = schedulerService.validateScheduledEvent(event);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event time is required');
    });
    
    it('should reject event with invalid type', () => {
      const event = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'invalid',
        target_id: 'macro1'
      };
      
      const result = schedulerService.validateScheduledEvent(event);
      
      expect(result.valid).toBe(false);
    });
  });
});

module.exports = {};
