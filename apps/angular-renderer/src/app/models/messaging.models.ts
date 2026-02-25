/**
 * Event type constants for internal application messaging
 */
export const EVENT_TYPES = {
    // Audio events
    AUDIO_TRACK_LOADED: 'audio:track-loaded',
    AUDIO_PLAYBACK_STARTED: 'audio:playback-started',
    AUDIO_PLAYBACK_STOPPED: 'audio:playback-stopped',
    AUDIO_PLAYBACK_PAUSED: 'audio:playback-paused',
    AUDIO_PLAYBACK_RESUMED: 'audio:playback-resumed',
    AUDIO_PLAYBACK_FINISHED: 'audio:playback-finished',
    AUDIO_TRACKS_LOADED: 'audio:tracks-loaded',
    AUDIO_VOLUME_CHANGED: 'audio:volume-changed',
    AUDIO_PAN_CHANGED: 'audio:pan-changed',
    AUDIO_MUTE_TOGGLED: 'audio:mute-toggled',
    AUDIO_SOLO_TOGGLED: 'audio:solo-toggled',

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

    // App lifecycle events
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export interface TrackLoadedPayload {
    trackId: string;
    name: string;
    path: string;
}

export interface PlaybackStatePayload {
    isPlaying: boolean;
    isPaused: boolean;
}

export interface VolumeChangedPayload {
    trackId?: string;
    volume: number;
    isGlobal?: boolean;
}

export interface SlideChangedPayload {
    slideId: string;
    title: string;
    content: string;
}

export interface ErrorPayload {
    message: string;
    code?: string;
    details?: any;
}

export type EventPayload =
    | TrackLoadedPayload
    | PlaybackStatePayload
    | VolumeChangedPayload
    | SlideChangedPayload
    | ErrorPayload
    | any;
