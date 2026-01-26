/**
 * EventBusService Tests
 * 
 * Tests for the centralized event bus pub/sub system
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventBusService, { EVENT_TYPES } from '../../services/EventBusService.js';

describe('EventBusService', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBusService();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('subscribe and publish', () => {
    it('should subscribe to events and receive published data', () => {
      const handler = vi.fn();
      const payload = { trackId: '123', name: 'Song.mp3' };

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler);
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple handlers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      const payload = { data: 'test' };

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler1);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler2);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler3);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
      expect(handler3).toHaveBeenCalledWith(payload);
    });

    it('should publish events without payload', () => {
      const handler = vi.fn();

      eventBus.subscribe(EVENT_TYPES.PLAYBACK_STARTED, handler);
      eventBus.publish(EVENT_TYPES.PLAYBACK_STARTED);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(null);
    });

    it('should handle publishing to events with no subscribers', () => {
      expect(() => {
        eventBus.publish(EVENT_TYPES.TRACK_LOADED, { data: 'test' });
      }).not.toThrow();
    });

    it('should support different event types independently', () => {
      const trackHandler = vi.fn();
      const slideHandler = vi.fn();

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, trackHandler);
      eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, slideHandler);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { track: 'data' });
      eventBus.publish(EVENT_TYPES.SLIDE_CHANGED, { slide: 'data' });

      expect(trackHandler).toHaveBeenCalledWith({ track: 'data' });
      expect(trackHandler).not.toHaveBeenCalledWith({ slide: 'data' });
      
      expect(slideHandler).toHaveBeenCalledWith({ slide: 'data' });
      expect(slideHandler).not.toHaveBeenCalledWith({ track: 'data' });
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe a handler via returned function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler);
      
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 2 });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should unsubscribe a specific handler without affecting others', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler1);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler2);

      unsubscribe1();

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 'data' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle unsubscribing a handler that does not exist', () => {
      const handler = vi.fn();

      expect(() => {
        eventBus.unsubscribe(EVENT_TYPES.TRACK_LOADED, handler);
      }).not.toThrow();
    });

    it('should clean up empty handler sets', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler);
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(1);

      unsubscribe();
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(0);
      expect(eventBus.getRegisteredEvents()).not.toContain(EVENT_TYPES.TRACK_LOADED);
    });
  });

  describe('clear', () => {
    it('should clear all handlers for a specific event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler1);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler2);
      eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, vi.fn());

      eventBus.clear(EVENT_TYPES.TRACK_LOADED);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, {});
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();

      expect(eventBus.getHandlerCount(EVENT_TYPES.SLIDE_CHANGED)).toBe(1);
    });

    it('should clear all handlers when called without argument', () => {
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, vi.fn());
      eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, vi.fn());
      eventBus.subscribe(EVENT_TYPES.SONG_LOADED, vi.fn());

      expect(eventBus.getRegisteredEvents().length).toBe(3);

      eventBus.clear();

      expect(eventBus.getRegisteredEvents().length).toBe(0);
    });
  });

  describe('getHandlerCount', () => {
    it('should return correct handler count', () => {
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(0);

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, vi.fn());
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(1);

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, vi.fn());
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(2);

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, vi.fn());
      expect(eventBus.getHandlerCount(EVENT_TYPES.TRACK_LOADED)).toBe(3);
    });
  });

  describe('getRegisteredEvents', () => {
    it('should return all registered event types', () => {
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, vi.fn());
      eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, vi.fn());
      eventBus.subscribe(EVENT_TYPES.SONG_LOADED, vi.fn());

      const events = eventBus.getRegisteredEvents();
      expect(events).toContain(EVENT_TYPES.TRACK_LOADED);
      expect(events).toContain(EVENT_TYPES.SLIDE_CHANGED);
      expect(events).toContain(EVENT_TYPES.SONG_LOADED);
      expect(events.length).toBe(3);
    });

    it('should return empty array when no events registered', () => {
      expect(eventBus.getRegisteredEvents()).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid event type on subscribe', () => {
      expect(() => {
        eventBus.subscribe(123, vi.fn());
      }).toThrow('EventBus: eventType must be a string');
    });

    it('should throw error for invalid handler on subscribe', () => {
      expect(() => {
        eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, 'not a function');
      }).toThrow('EventBus: handler must be a function');
    });

    it('should throw error for invalid event type on publish', () => {
      expect(() => {
        eventBus.publish(null, {});
      }).toThrow('EventBus: eventType must be a string');
    });

    it('should continue executing handlers even if one throws', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler1);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler2);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, handler3);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 'data' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('once', () => {
    it('should auto-unsubscribe after first trigger', () => {
      const handler = vi.fn();

      eventBus.once(EVENT_TYPES.TRACK_LOADED, handler);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 2 });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should return unsubscribe function that works before trigger', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.once(EVENT_TYPES.TRACK_LOADED, handler);
      unsubscribe();

      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { test: 'data' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('waitFor', () => {
    it('should resolve when event is published', async () => {
      const payload = { test: 'data' };

      setTimeout(() => {
        eventBus.publish(EVENT_TYPES.TRACK_LOADED, payload);
      }, 10);

      const result = await eventBus.waitFor(EVENT_TYPES.TRACK_LOADED);
      expect(result).toEqual(payload);
    });

    it('should reject on timeout', async () => {
      await expect(
        eventBus.waitFor(EVENT_TYPES.TRACK_LOADED, 50)
      ).rejects.toThrow('Timeout waiting for event');
    });

    it('should resolve before timeout if event is published', async () => {
      setTimeout(() => {
        eventBus.publish(EVENT_TYPES.TRACK_LOADED, { data: 'test' });
      }, 10);

      await expect(
        eventBus.waitFor(EVENT_TYPES.TRACK_LOADED, 100)
      ).resolves.toEqual({ data: 'test' });
    });
  });

  describe('debug and history', () => {
    it('should record events in history', () => {
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { track: 1 });
      eventBus.publish(EVENT_TYPES.SLIDE_CHANGED, { slide: 2 });

      const history = eventBus.getEventHistory();
      expect(history.length).toBe(2);
      expect(history[0].type).toBe(EVENT_TYPES.TRACK_LOADED);
      expect(history[0].payload).toEqual({ track: 1 });
      expect(history[1].type).toBe(EVENT_TYPES.SLIDE_CHANGED);
      expect(history[1].payload).toEqual({ slide: 2 });
    });

    it('should limit history to max size', () => {
      eventBus.maxHistory = 5;

      for (let i = 0; i < 10; i++) {
        eventBus.publish(EVENT_TYPES.TRACK_LOADED, { index: i });
      }

      const history = eventBus.getEventHistory();
      expect(history.length).toBe(5);
      expect(history[0].payload.index).toBe(5); // First 5 were dropped
      expect(history[4].payload.index).toBe(9);
    });

    it('should clear history', () => {
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, {});
      eventBus.publish(EVENT_TYPES.SLIDE_CHANGED, {});

      expect(eventBus.getEventHistory().length).toBe(2);

      eventBus.clearHistory();

      expect(eventBus.getEventHistory().length).toBe(0);
    });

    it('should enable and disable debug mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(eventBus.debug).toBe(false);

      eventBus.setDebug(true);
      expect(eventBus.debug).toBe(true);

      eventBus.setDebug(false);
      expect(eventBus.debug).toBe(false);

      consoleLogSpy.mockRestore();
    });
  });

  describe('EVENT_TYPES constants', () => {
    it('should have all required audio event types', () => {
      expect(EVENT_TYPES.TRACK_LOADED).toBe('audio:track-loaded');
      expect(EVENT_TYPES.PLAYBACK_STARTED).toBe('audio:playback-started');
      expect(EVENT_TYPES.PLAYBACK_STOPPED).toBe('audio:playback-stopped');
      expect(EVENT_TYPES.TRACKS_UPDATED).toBe('audio:tracks-updated');
    });

    it('should have all required slide event types', () => {
      expect(EVENT_TYPES.SLIDE_CHANGED).toBe('slide:changed');
      expect(EVENT_TYPES.SLIDE_IMPORTED).toBe('slide:imported');
      expect(EVENT_TYPES.SLIDES_LOADED).toBe('slide:slides-loaded');
    });

    it('should have all required setlist event types', () => {
      expect(EVENT_TYPES.SONG_LOADED).toBe('setlist:song-loaded');
      expect(EVENT_TYPES.SONG_CHANGED).toBe('setlist:song-changed');
      expect(EVENT_TYPES.FOLDER_ADDED).toBe('setlist:folder-added');
    });

    it('should have all required display event types', () => {
      expect(EVENT_TYPES.DISPLAY_CONFIG_CHANGED).toBe('display:config-changed');
      expect(EVENT_TYPES.WINDOW_OPENED).toBe('display:window-opened');
      expect(EVENT_TYPES.WINDOW_CLOSED).toBe('display:window-closed');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle audio playback workflow', () => {
      const trackLoadedHandler = vi.fn();
      const playbackStartedHandler = vi.fn();
      const playbackStoppedHandler = vi.fn();

      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, trackLoadedHandler);
      eventBus.subscribe(EVENT_TYPES.PLAYBACK_STARTED, playbackStartedHandler);
      eventBus.subscribe(EVENT_TYPES.PLAYBACK_STOPPED, playbackStoppedHandler);

      // Simulate workflow
      eventBus.publish(EVENT_TYPES.TRACK_LOADED, { trackId: '123' });
      eventBus.publish(EVENT_TYPES.PLAYBACK_STARTED);
      eventBus.publish(EVENT_TYPES.PLAYBACK_STOPPED);

      expect(trackLoadedHandler).toHaveBeenCalledWith({ trackId: '123' });
      expect(playbackStartedHandler).toHaveBeenCalledWith(null);
      expect(playbackStoppedHandler).toHaveBeenCalledWith(null);
    });

    it('should handle slide import and display workflow', () => {
      const importedHandler = vi.fn();
      const changedHandler = vi.fn();
      const displayedHandler = vi.fn();

      eventBus.subscribe(EVENT_TYPES.SLIDE_IMPORTED, importedHandler);
      eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, changedHandler);
      eventBus.subscribe(EVENT_TYPES.SLIDE_DISPLAYED, displayedHandler);

      // Simulate workflow
      eventBus.publish(EVENT_TYPES.SLIDE_IMPORTED, { count: 10 });
      eventBus.publish(EVENT_TYPES.SLIDE_CHANGED, { index: 0 });
      eventBus.publish(EVENT_TYPES.SLIDE_DISPLAYED, { slideId: 'slide-1' });

      expect(importedHandler).toHaveBeenCalledWith({ count: 10 });
      expect(changedHandler).toHaveBeenCalledWith({ index: 0 });
      expect(displayedHandler).toHaveBeenCalledWith({ slideId: 'slide-1' });
    });

    it('should handle multiple ViewModels communicating', () => {
      // Simulate SetlistViewModel loading a song
      const songLoadedHandler = vi.fn((payload) => {
        // AudioViewModel responds by loading tracks
        eventBus.publish(EVENT_TYPES.TRACK_LOADED, { 
          songId: payload.songId, 
          tracks: ['track1.mp3', 'track2.mp3'] 
        });
      });

      const trackLoadedHandler = vi.fn();

      eventBus.subscribe(EVENT_TYPES.SONG_LOADED, songLoadedHandler);
      eventBus.subscribe(EVENT_TYPES.TRACK_LOADED, trackLoadedHandler);

      eventBus.publish(EVENT_TYPES.SONG_LOADED, { songId: 'song-123' });

      expect(songLoadedHandler).toHaveBeenCalledWith({ songId: 'song-123' });
      expect(trackLoadedHandler).toHaveBeenCalledWith({
        songId: 'song-123',
        tracks: ['track1.mp3', 'track2.mp3']
      });
    });
  });
});
