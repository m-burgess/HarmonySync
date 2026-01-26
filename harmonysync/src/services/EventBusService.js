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

/**
 * Event type constants - Use these for type-safe event handling
 */
export const EVENT_TYPES = {
  // Audio events
  TRACK_LOADED: 'audio:track-loaded',
  PLAYBACK_STARTED: 'audio:playback-started',
  PLAYBACK_STOPPED: 'audio:playback-stopped',
  PLAYBACK_PAUSED: 'audio:playback-paused',
  PLAYBACK_RESUMED: 'audio:playback-resumed',
  TRACKS_UPDATED: 'audio:tracks-updated',
  VOLUME_CHANGED: 'audio:volume-changed',
  TRANSPOSE_STARTED: 'audio:transpose-started',
  TRANSPOSE_COMPLETED: 'audio:transpose-completed',
  TRANSPOSE_FAILED: 'audio:transpose-failed',
  
  // Slide events
  SLIDE_CHANGED: 'slide:changed',
  SLIDE_IMPORTED: 'slide:imported',
  SLIDES_LOADED: 'slide:slides-loaded',
  SLIDE_DISPLAYED: 'slide:displayed',
  SLIDE_CLEARED: 'slide:cleared',
  
  // Setlist events
  SONG_LOADED: 'setlist:song-loaded',
  SONG_CHANGED: 'setlist:song-changed',
  FOLDER_ADDED: 'setlist:folder-added',
  SETLIST_UPDATED: 'setlist:updated',
  
  // Display events
  DISPLAY_CONFIG_CHANGED: 'display:config-changed',
  WINDOW_OPENED: 'display:window-opened',
  WINDOW_CLOSED: 'display:window-closed',
  
  // Lyrics events
  LYRICS_FETCHED: 'lyrics:fetched',
  LYRICS_DISPLAYED: 'lyrics:displayed',
  LYRICS_SCROLLED: 'lyrics:scrolled',
  
  // Video events
  VIDEO_ENDED: 'video:ended',
  VIDEO_LOADED: 'video:loaded',
  
  // App lifecycle events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
};

/**
 * EventBus Service
 * Provides pub/sub pattern for cross-component communication
 */
class EventBusService {
  constructor() {
    // Map of event type -> Set of handlers
    this.listeners = new Map();
    
    // Enable debugging to log all events
    this.debug = false;
    
    // Event history for debugging (last 50 events)
    this.eventHistory = [];
    this.maxHistory = 50;
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Event type (use EVENT_TYPES constants)
   * @param {Function} handler - Handler function (payload) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
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

    const handlers = this.listeners.get(eventType);
    handlers.add(handler);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${eventType}" (${handlers.size} total handlers)`);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler function to remove
   */
  unsubscribe(eventType, handler) {
    const handlers = this.listeners.get(eventType);
    
    if (!handlers) {
      if (this.debug) {
        console.warn(`[EventBus] No handlers found for "${eventType}"`);
      }
      return;
    }

    handlers.delete(handler);

    if (this.debug) {
      console.log(`[EventBus] Unsubscribed from "${eventType}" (${handlers.size} remaining handlers)`);
    }

    // Clean up empty handler sets
    if (handlers.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventType - Event type (use EVENT_TYPES constants)
   * @param {*} payload - Optional event data
   */
  publish(eventType, payload = null) {
    if (typeof eventType !== 'string') {
      throw new Error(`EventBus: eventType must be a string, got ${typeof eventType}`);
    }

    const handlers = this.listeners.get(eventType);
    
    if (this.debug) {
      console.log(`[EventBus] Publishing "${eventType}"`, payload);
    }

    // Record in history
    this._recordEvent(eventType, payload);

    // No handlers? Nothing to do
    if (!handlers || handlers.size === 0) {
      if (this.debug) {
        console.log(`[EventBus] No handlers for "${eventType}"`);
      }
      return;
    }

    // Call all handlers (copy set to avoid issues if handlers modify listeners)
    const handlersCopy = Array.from(handlers);
    
    for (const handler of handlersCopy) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${eventType}":`, error);
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Remove all listeners for a specific event type
   * @param {string} eventType - Event type
   */
  clear(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
      if (this.debug) {
        console.log(`[EventBus] Cleared all handlers for "${eventType}"`);
      }
    } else {
      // Clear all listeners
      this.listeners.clear();
      if (this.debug) {
        console.log(`[EventBus] Cleared all handlers`);
      }
    }
  }

  /**
   * Get count of handlers for an event type
   * @param {string} eventType - Event type
   * @returns {number} Number of handlers
   */
  getHandlerCount(eventType) {
    const handlers = this.listeners.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all registered event types
   * @returns {string[]} Array of event types
   */
  getRegisteredEvents() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable debug logging
   */
  setDebug(enabled) {
    this.debug = !!enabled;
    console.log(`[EventBus] Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get event history for debugging
   * @returns {Array} Recent events
   */
  getEventHistory() {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Record an event in history (internal)
   * @private
   */
  _recordEvent(eventType, payload) {
    this.eventHistory.push({
      type: eventType,
      payload,
      timestamp: Date.now(),
    });

    // Keep only last N events
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler function
   * @returns {Function} Unsubscribe function
   */
  once(eventType, handler) {
    const wrappedHandler = (payload) => {
      handler(payload);
      this.unsubscribe(eventType, wrappedHandler);
    };

    return this.subscribe(eventType, wrappedHandler);
  }

  /**
   * Wait for an event (returns a Promise)
   * @param {string} eventType - Event type
   * @param {number} timeout - Optional timeout in ms
   * @returns {Promise} Promise that resolves with event payload
   */
  waitFor(eventType, timeout = 0) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;
      
      const unsubscribe = this.once(eventType, (payload) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(payload);
      });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event "${eventType}"`));
        }, timeout);
      }
    });
  }
}

export default EventBusService;
