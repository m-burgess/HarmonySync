/**
 * Scheduler Service
 * Handles scheduled event management and execution with TypeScript OOP design
 * 
 * ⚠️  NOTE: Database-dependent CRUD functions in this file are DEPRECATED.
 * The IPC handlers now call json-storage methods directly for all CRUD operations.
 * Only validateScheduledEvent() and execution logic are actively used.
 */

import { BaseElectronService, ISchedulerService, ServiceConfig } from '../types/services';

// ==================== Type Definitions ====================

/**
 * Valid event types for scheduled events
 */
export type EventType = 'macro' | 'presentation' | 'media' | 'custom';

/**
 * Scheduled event structure
 */
export interface ScheduledEvent {
  id?: string;
  event_time: string;
  event_type: EventType;
  target_id: string;
  formatted_time?: string;
  formatted_date?: string;
  is_past?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Time range for querying events
 */
export interface TimeRange {
  startTime: string;
  endTime: string;
}

// ==================== Scheduler Service Class ====================

/**
 * Scheduler Service Implementation
 * Provides scheduling functionality with validation and time-based querying
 */
export class SchedulerService extends BaseElectronService implements ISchedulerService {
  protected readonly serviceName = 'SchedulerService';
  
  // Valid event types constant
  private static readonly VALID_EVENT_TYPES: EventType[] = ['macro', 'presentation', 'media', 'custom'];
  
  constructor(config?: ServiceConfig) {
    super(config);
  }

  /**
   * Initialize the scheduler service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Scheduler service ready');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Scheduler service disposed');
  }

  // ==================== Public API Methods ====================

  /**
   * Get events within a date range
   * @param startDate - Start date (optional, defaults to now)
   * @param endDate - End date (optional, defaults to 24 hours from start)
   * @returns Promise resolving to array of events
   */
  public async getEvents(startDate?: Date, endDate?: Date): Promise<ScheduledEvent[]> {
    const start = startDate || new Date();
    const end = endDate || new Date(start.getTime() + 24 * 60 * 60 * 1000);
    
    this.log('debug', `Getting events from ${start.toISOString()} to ${end.toISOString()}`);
    
    // This is a placeholder - actual implementation would query storage
    // In practice, this is deprecated and IPC handlers call json-storage directly
    return [];
  }

  /**
   * Create a new scheduled event
   * @param event - Event data
   * @returns Promise resolving to event ID
   */
  public async createEvent(event: ScheduledEvent): Promise<string> {
    const validation = this.validateScheduledEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid event: ${validation.errors.join(', ')}`);
    }
    
    this.log('info', `Creating event: ${event.event_type} at ${event.event_time}`);
    
    // Deprecated - actual implementation in IPC handlers
    return 'deprecated';
  }

  /**
   * Update an existing event
   * @param id - Event ID
   * @param event - Updated event data
   */
  public async updateEvent(id: string, event: ScheduledEvent): Promise<void> {
    const validation = this.validateScheduledEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid event: ${validation.errors.join(', ')}`);
    }
    
    this.log('info', `Updating event ${id}`);
    
    // Deprecated - actual implementation in IPC handlers
  }

  /**
   * Delete an event
   * @param id - Event ID
   */
  public async deleteEvent(id: string): Promise<void> {
    this.log('info', `Deleting event ${id}`);
    
    // Deprecated - actual implementation in IPC handlers
  }

  /**
   * Get upcoming events within specified minutes
   * @param minutes - Number of minutes to look ahead (default: 60)
   * @returns Promise resolving to array of upcoming events
   */
  public async getUpcoming(minutes: number = 60): Promise<ScheduledEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60 * 1000);
    
    return this.getEvents(now, future);
  }

  // ==================== Utility Methods ====================

  /**
   * Check if event should execute now
   * @param event - Event object
   * @param toleranceMs - Tolerance in milliseconds (default: 60000)
   * @returns Whether event should execute
   */
  public shouldExecuteNow(event: ScheduledEvent, toleranceMs: number = 60000): boolean {
    const now = Date.now();
    const eventTime = new Date(event.event_time).getTime();
    const diff = Math.abs(now - eventTime);
    
    return diff <= toleranceMs && now >= eventTime;
  }

  /**
   * Parse event time string to Date
   * @param timeString - Time string (ISO or HH:MM format)
   * @returns Parsed date
   */
  public parseEventTime(timeString: string): Date {
    // Try ISO format first
    let date = new Date(timeString);
    
    if (isNaN(date.getTime())) {
      // Try HH:MM format
      const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const now = new Date();
        date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(match[1], 10),
          parseInt(match[2], 10)
        );
      }
    }
    
    return date;
  }

  /**
   * Format event for display
   * @param event - Event object
   * @returns Formatted event with display properties
   */
  public formatEventForDisplay(event: ScheduledEvent): ScheduledEvent {
    const eventDate = new Date(event.event_time);
    
    return {
      ...event,
      formatted_time: eventDate.toLocaleTimeString(),
      formatted_date: eventDate.toLocaleDateString(),
      is_past: eventDate < new Date()
    };
  }

  /**
   * Validate scheduled event data
   * @param event - Event object
   * @returns Validation result
   */
  public validateScheduledEvent(event: ScheduledEvent): ValidationResult {
    const errors: string[] = [];
    
    if (!event.event_time) {
      errors.push('Event time is required');
    } else {
      const eventDate = this.parseEventTime(event.event_time);
      if (isNaN(eventDate.getTime())) {
        errors.push('Invalid event time format');
      }
    }
    
    if (!event.event_type || typeof event.event_type !== 'string') {
      errors.push('Event type is required');
    }
    
    if (!event.target_id || typeof event.target_id !== 'string') {
      errors.push('Target ID is required');
    }
    
    if (event.event_type && !SchedulerService.VALID_EVENT_TYPES.includes(event.event_type)) {
      errors.push(`Invalid event type. Must be one of: ${SchedulerService.VALID_EVENT_TYPES.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get events in a specific time range
   * @param startTime - Start time (ISO string)
   * @param endTime - End time (ISO string)
   * @returns Promise resolving to array of events
   */
  public async getEventsInTimeRange(startTime: string, endTime: string): Promise<ScheduledEvent[]> {
    this.log('debug', `Getting events in range: ${startTime} to ${endTime}`);
    
    // Deprecated - actual implementation in IPC handlers
    return [];
  }

  /**
   * Get events scheduled for today
   * @returns Promise resolving to array of today's events
   */
  public async getTodayEvents(): Promise<ScheduledEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return this.getEventsInTimeRange(startOfDay.toISOString(), endOfDay.toISOString());
  }

  /**
   * Get upcoming events with specified hours ahead
   * @param hours - Number of hours to look ahead (default: 24)
   * @returns Promise resolving to array of upcoming events
   */
  public async getUpcomingEvents(hours: number = 24): Promise<ScheduledEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return this.getEventsInTimeRange(now.toISOString(), future.toISOString());
  }
}

// ==================== Singleton Export ====================

let schedulerServiceInstance: SchedulerService | null = null;

/**
 * Get or create the scheduler service singleton
 */
export function getSchedulerService(config?: ServiceConfig): SchedulerService {
  if (!schedulerServiceInstance) {
    schedulerServiceInstance = new SchedulerService(config);
  }
  return schedulerServiceInstance;
}

// Export for backward compatibility
export default SchedulerService;
