/**
 * Type declarations for audio-nodejs module
 * This provides TypeScript types for the legacy JavaScript audio utilities
 */

export interface AudioTrackResult {
  success: boolean;
  path?: string;
  trackId?: string;
  name?: string;
  error?: string;
}

export interface ServiceChecker {
  checkStatus(): Promise<boolean>;
  getHealth(): Promise<unknown>;
}

export function initializeAudioService(): Promise<void>;
export function getTracks(): unknown[];
export function clearTracks(): Promise<void>;
export function addTracks(trackPaths: string[], songName?: string | null): Promise<AudioTrackResult[]>;
export function playAllTracks(): Promise<void>;
export function stopAllAudio(): Promise<void>;
export function goToBeginningAllTracks(): Promise<void>;
export function setGlobalVolume(volume: number): Promise<void>;
export function setTrackMute(track: { id: string }, muted: boolean): Promise<void>;
export function setPan(track: { id: string }, panValue: number): Promise<void>;
export function startAudioServiceFromApp(): Promise<{ success: boolean; message?: string }>;
export function checkAudioServiceStatusFromApp(): Promise<boolean>;
export function getAudioServiceHealth(): Promise<unknown>;
export function getServiceChecker(): ServiceChecker;
export function cleanupAndStopAudio(): Promise<void>;
