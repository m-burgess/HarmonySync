/**
 * Shared data models for the Angular Renderer audio mixer.
 * These mirror the Go media engine's JSON response shapes.
 */

export interface Track {
    id: string;
    name: string;
    path: string;
    index: number;
    volume: number;   // 0.0 – 1.0
    pan: number;      // -1.0 (L) to 1.0 (R)
    muted: boolean;
    soloed: boolean;
    isPreloaded: boolean;
    preloadStatus: 'pending' | 'loading' | 'ready' | 'error';
    preloadError?: string;
}

export interface WsEvent {
    type: string;
    [key: string]: any;
}
