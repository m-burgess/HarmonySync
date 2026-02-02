// Export the Node.js audio service (lightweight, ~67MB memory usage)
export * from './audio-nodejs';
export * from './nodejs-audio-client';
export * from './song-transition';

// Keep cache utilities
export * from './cache';
// export * from './streaming-audio'; // Web Audio API streaming

// Re-export the generated typed audio API client for convenient imports
export * as audioApi from '../api';
