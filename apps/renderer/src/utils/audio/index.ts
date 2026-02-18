// Audio utilities barrel export
// Legacy audio-nodejs and nodejs-audio-client have been removed
// Audio playback is now handled by RemoteAudioMixer -> Go Engine

// Keep cache utilities
export * from './cache';

// Re-export the generated typed audio API client for convenient imports
export * as audioApi from '../api';
