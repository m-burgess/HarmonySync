/**
 * Event types and payload definitions for EventBus
 * Provides type safety for pub/sub event system
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
  
  // Service Order events
  SONG_LOADED: 'service-order:song-loaded',
  SONG_CHANGED: 'service-order:song-changed',
  FOLDER_ADDED: 'service-order:folder-added',
  SERVICE_ORDER_UPDATED: 'service-order:updated',
  
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
} as const;

/**
 * Type for event type values
 */
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Event payload types
 */

// Audio event payloads
export interface TrackLoadedPayload {
  trackId: string;
  name: string;
  path: string;
}

export interface PlaybackStatePayload {
  isPlaying: boolean;
  isPaused: boolean;
}

export interface TracksUpdatedPayload {
  tracks: Array<{
    id: string;
    name: string;
    volume: number;
    pan: number;
    muted: boolean;
  }>;
}

export interface VolumeChangedPayload {
  trackId?: string;
  volume: number;
  isGlobal?: boolean;
}

export interface TransposeStartedPayload {
  sourcePath: string;
  semitones: number;
}

export interface TransposeCompletedPayload {
  sourcePath: string;
  outputPath: string;
  semitones: number;
}

export interface TransposeFailedPayload {
  sourcePath: string;
  semitones: number;
  error: string;
}

// Slide event payloads
export interface SlideChangedPayload {
  slideId: string;
  title: string;
  content: string;
}

export interface SlideImportedPayload {
  count: number;
  source: string;
}

export interface SlidesLoadedPayload {
  slides: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export interface SlideDisplayedPayload {
  slideId: string;
  displayId: string;
}

// Service Order event payloads
export interface SongLoadedPayload {
  songId: string;
  title: string;
  folderPath: string;
}

export interface SongChangedPayload {
  songId: string;
  title: string;
}

export interface FolderAddedPayload {
  folderPath: string;
  songCount: number;
}

export interface ServiceOrderUpdatedPayload {
  folders: Array<{
    name: string;
    path: string;
    songCount: number;
  }>;
}

// Display event payloads
export interface DisplayConfigChangedPayload {
  displayId: string;
  config: {
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface WindowOpenedPayload {
  windowType: 'audience' | 'confidence' | 'lowerthirds' | 'preservice-music';
  displayId: string;
}

export interface WindowClosedPayload {
  windowType: 'audience' | 'confidence' | 'lowerthirds' | 'preservice-music';
}

// Generic error payload
export interface ErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Union type for all event payloads
 */
export type EventPayload =
  | TrackLoadedPayload
  | PlaybackStatePayload
  | TracksUpdatedPayload
  | VolumeChangedPayload
  | TransposeStartedPayload
  | TransposeCompletedPayload
  | TransposeFailedPayload
  | SlideChangedPayload
  | SlideImportedPayload
  | SlidesLoadedPayload
  | SlideDisplayedPayload
  | SongLoadedPayload
  | SongChangedPayload
  | FolderAddedPayload
  | ServiceOrderUpdatedPayload
  | DisplayConfigChangedPayload
  | WindowOpenedPayload
  | WindowClosedPayload
  | ErrorPayload
  | null;

/**
 * Event handler function type
 */
export type EventHandler<T = EventPayload> = (payload: T) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFunction = () => void;

/**
 * Event record for history
 */
export interface EventRecord {
  type: EventType;
  payload: EventPayload;
  timestamp: number;
}
