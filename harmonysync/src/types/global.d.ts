// Global ambient declarations for renderer runtime globals used in several components

export {};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    electronAPI?: unknown;
    __electronAPICached?: unknown;
    __electronAPI_PERMANENT_CACHE?: unknown;
    __preloadReady?: boolean;
  }

  interface HTMLVideoElement {
    // Optional helpers used in code (intervalId, destroy)
    intervalId?: number;
    destroy?: () => void;
  }
}
