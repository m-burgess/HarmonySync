/**
 * EventBus Service - Centralized pub/sub event system for HarmonySync
 * 
 * This service provides a clean, type-safe event system for cross-component communication.
 * It replaces scattered window events with a centralized pattern.
 * 
 * Key features:
 * - Type-safe event names (use EVENT_TYPES constants)
 * - Payload support for event data
 * - Automatic cleanup via unsubscribe
 * - Debugging support with event logging
 * 
 * OOP Principles:
 * - Encapsulation: Private listeners map, public methods
 * - Single Responsibility: Only handles event pub/sub
 * - Interface Segregation: Implements IEventBusService
 * 
 * Usage:
 *   // Subscribe to an event
 *   const unsubscribe = eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, (payload) => {
 *     console.log('Track loaded:', payload);
 *   });
 * 
 *   // Publish an event
 *   eventBus.publish(EVENT_TYPES.TRACK_LOADED, { trackId: '123', name: 'Song.mp3' });
 * 
 *   // Cleanup
 *   unsubscribe();
 */

import { BaseService } from '../base/BaseService';
import type { IEventBusService } from '../types/services';
import type { EventType, EventHandler, UnsubscribeFunction, EventRecord, EventPayload } from '../types';
import { EVENT_TYPES } from '../types';

/**
 * EventBus Service Implementation
 */
export class EventBusService extends BaseService implements IEventBusService {
  protected readonly serviceName = 'EventBusService';
  
  /**
   * Map of event type -> Set of handlers
   */
  private readonly listeners: Map<EventType, Set<EventHandler>> = new Map();
  
  /**
   * Enable debugging to log all events
   */
  private debug: boolean = false;
  
  /**
   * Event history for debugging (last N events)
   */
  private eventHistory: EventRecord[] = [];
  
  /**
   * Maximum number of events to keep in history
   */
  private readonly maxHistory: number = 50;

  /**
   * Subscribe to an event
   * @param eventType - Event type (use EVENT_TYPES constants)
   * @param handler - Handler function (payload) => void
   * @returns Unsubscribe function
   */
  public subscribe<T = unknown>(eventType: EventType, handler: EventHandler<T>): UnsubscribeFunction {
    if (typeof eventType !== 'string') {
      throw new Error(`EventBus: eventType must be a string, got ${typeof eventType}`);
    }
    
    if (typeof handler !== 'function') {
      throw new Error(`EventBus: handler must be a function, got ${typeof handler}`);
    }

    // Get or create listener set for this event type
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const handlers = this.listeners.get(eventType)!;
    // Cast to generic handler for storage
    handlers.add(handler as unknown as EventHandler);

    if (this.debug) {
      this.log(`Subscribed to "${eventType}" (${handlers.size} total handlers)`);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler as unknown as EventHandler);
  }

  /**
   * Unsubscribe from an event
   * @param eventType - Event type
   * @param handler - Handler function to remove
   */
  public unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType);
    
    if (!handlers) {
      if (this.debug) {
        this.logWarn(`No handlers found for "${eventType}"`);
      }
      return;
    }

    handlers.delete(handler);

    if (this.debug) {
      this.log(`Unsubscribed from "${eventType}" (${handlers.size} remaining handlers)`);
    }

    // Clean up empty handler sets
    if (handlers.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  /**
   * Publish an event to all subscribers
   * @param eventType - Event type (use EVENT_TYPES constants)
   * @param payload - Optional event data
   */
  public publish<T = unknown>(eventType: EventType, payload?: T): void {
    if (typeof eventType !== 'string') {
      throw new Error(`EventBus: eventType must be a string, got ${typeof eventType}`);
    }

    const handlers = this.listeners.get(eventType);
    
    if (this.debug) {
      this.log(`Publishing "${eventType}"`, payload);
    }

    // Record in history - cast payload to unknown for storage
    this.recordEvent(eventType, payload as unknown);

    // No handlers? Nothing to do
    if (!handlers || handlers.size === 0) {
      if (this.debug) {
        this.log(`No handlers for "${eventType}"`);
      }
      return;
    }

    // Call all handlers (copy set to avoid issues if handlers modify listeners)
    const handlersCopy = Array.from(handlers);
    
    for (const handler of handlersCopy) {
      try {
        if (payload !== undefined) {
          handler(payload as EventPayload);
        }
      } catch (error) {
        this.logError(`Error in handler for "${eventType}"`, error);
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Remove all listeners for a specific event type
   * @param eventType - Event type (optional - if not provided, clears all)
   */
  public clear(eventType?: EventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
      if (this.debug) {
        this.log(`Cleared all handlers for "${eventType}"`);
      }
    } else {
      // Clear all listeners
      this.listeners.clear();
      if (this.debug) {
        this.log('Cleared all handlers');
      }
    }
  }

  /**
   * Get count of handlers for an event type
   * @param eventType - Event type
   * @returns Number of handlers
   */
  public getHandlerCount(eventType: EventType): number {
    const handlers = this.listeners.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all registered event types
   * @returns Array of event types
   */
  public getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Enable or disable debug logging
   * @param enabled - Whether to enable debug logging
   */
  public setDebug(enabled: boolean): void {
    this.debug = !!enabled;
    this.log(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get event history for debugging
   * @returns Recent events
   */
  public getEventHistory(): EventRecord[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Record an event in history (internal)
   * @private
   */
  private recordEvent(eventType: EventType, payload: unknown): void {
    this.eventHistory.push({
      type: eventType,
      payload: payload as EventPayload,
      timestamp: Date.now(),
    });

    // Keep only last N events
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param eventType - Event type
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  public once<T = unknown>(eventType: EventType, handler: EventHandler<T>): UnsubscribeFunction {
    const wrappedHandler: EventHandler<T> = (payload) => {
      handler(payload);
      this.unsubscribe(eventType, wrappedHandler as EventHandler);
    };

    return this.subscribe(eventType, wrappedHandler);
  }

  /**
   * Wait for an event (returns a Promise)
   * @param eventType - Event type
   * @param timeout - Optional timeout in ms
   * @returns Promise that resolves with event payload
   */
  public waitFor<T = unknown>(eventType: EventType, timeout: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      const unsubscribe = this.once(eventType, (payload) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(payload as T);
      });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event "${eventType}"`));
        }, timeout);
      }
    });
  }

  /**
   * Cleanup on dispose
   */
  protected override onDispose(): void {
    this.clear();
    this.clearHistory();
  }
}

// Re-export EVENT_TYPES for convenience
export { EVENT_TYPES };
export default EventBusService;
