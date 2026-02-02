/**
 * Tests for Scheduler Service
 */

import SchedulerService, { ScheduledEvent, ValidationResult } from '../scheduler-service';

interface MockDatabase {
  all: jest.Mock;
  get: jest.Mock;
  run: jest.Mock;
  prepare: jest.Mock;
}

interface MockPreparedStatement {
  run: jest.Mock;
  finalize: jest.Mock;
}

describe('Scheduler Service', () => {
  let mockDb: MockDatabase;
  let service: SchedulerService;
  
  beforeEach(() => {
    mockDb = {
      all: jest.fn((query: string, params: any[], callback: Function) => callback(null, [])),
      get: jest.fn((query: string, params: any[], callback: Function) => callback(null, null)),
      run: jest.fn((query: string, params: any[], callback: Function) => callback(null)),
      prepare: jest.fn((): MockPreparedStatement => ({
        run: jest.fn((p1: any, p2: any, p3: any, callback: Function) => {
          callback.call({ lastID: 1 }, null);
        }),
        finalize: jest.fn()
      }))
    };
    
    service = new SchedulerService();
  });
  
  describe('createScheduledEvent', () => {
    it('should create new scheduled event', async () => {
      const event: ScheduledEvent = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = await service.createEvent(event);
      
      expect(typeof result).toBe('string'); // Returns ID
    });
  });
  
  describe('shouldExecuteNow', () => {
    it('should return true for events within tolerance', () => {
      const event: ScheduledEvent = {
        event_time: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = service.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(false); // Not past yet
    });
    
    it('should return true for past events within tolerance', () => {
      const event: ScheduledEvent = {
        event_time: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = service.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(true);
    });
    
    it('should return false for events outside tolerance', () => {
      const event: ScheduledEvent = {
        event_time: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result = service.shouldExecuteNow(event, 60000); // 60 second tolerance
      
      expect(result).toBe(false);
    });
  });
  
  describe('parseEventTime', () => {
    it('should parse ISO format', () => {
      const timeString = '2026-01-20T10:00:00Z';
      const result: Date = service.parseEventTime(timeString);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });
    
    it('should parse HH:MM format', () => {
      const timeString = '10:00';
      const result: Date = service.parseEventTime(timeString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(0);
    });
  });
  
  describe('formatEventForDisplay', () => {
    it('should format event for display', () => {
      const event: ScheduledEvent = {
        id: '1',
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result: ScheduledEvent = service.formatEventForDisplay(event);
      
      expect(result).toHaveProperty('formatted_time');
      expect(result).toHaveProperty('formatted_date');
      expect(result).toHaveProperty('is_past');
    });
  });
  
  describe('validateScheduledEvent', () => {
    it('should validate valid event', () => {
      const event: ScheduledEvent = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'macro',
        target_id: 'macro1'
      };
      
      const result: ValidationResult = service.validateScheduledEvent(event);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject event without time', () => {
      const event = {
        event_type: 'macro',
        target_id: 'macro1'
      } as ScheduledEvent;
      
      const result: ValidationResult = service.validateScheduledEvent(event);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event time is required');
    });
    
    it('should reject event with invalid type', () => {
      const event: ScheduledEvent = {
        event_time: '2026-01-20T10:00:00Z',
        event_type: 'invalid' as any,
        target_id: 'macro1'
      };
      
      const result: ValidationResult = service.validateScheduledEvent(event);
      
      expect(result.valid).toBe(false);
    });
  });
});
