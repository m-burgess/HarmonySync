// Export the Node.js audio service (lightweight, ~67MB memory usage)
export * from './audio-nodejs.js';
export * from './nodejs-audio-client.js';
export * from './song-transition.js';

// Keep cache utilities
export * from './cache.js';
// export * from './streaming-audio.js'; // Web Audio API streaming
// export * from './rust-audio-binary.js'; // Rust binary audio processing

// Re-export the generated typed audio API client for convenient imports
export * as audioApi from '../api'
