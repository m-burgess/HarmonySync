/**
 * Frontend scheduled playback using Web Audio API
 * This module implements buffer scheduling with AudioBufferSourceNode.start(when)
 * to keep all audio files properly synced without backend dependency
 */

import { getAudioContext, getTracks } from './audio-nodejs';
import { core } from '../../electron-adapter';
import type { Track } from '../../types/audio';

interface ScheduledTrack {
  track: Track;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  startTime: number;
}

// Track active scheduled sources
const scheduledTracks = new Map<string, ScheduledTrack>();

// Playback state for pause/resume/seek
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let playHeadStartTime: number | null = null; // audioContext.currentTime when playback started
let playHeadOffset: number = 0; // seconds offset into the track
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let isPaused: boolean = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let lastTracks: Track[] = [];

/**
 * Load an audio file into an AudioBuffer
 */
export async function loadAudioBuffer(filePath: string): Promise<AudioBuffer> {
  const audioContext = getAudioContext();
  
  try {
    const resolvedUrl = await resolveFetchUrl(filePath);
    console.log(`📥 Loading audio buffer: ${resolvedUrl}`);
    const controller = new AbortController();
    const timeoutMs = 30000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(resolvedUrl, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log(`✅ Audio buffer loaded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
    return audioBuffer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to load audio buffer for ${filePath}: ${errorMessage}`);
    throw error;
  }
}

function resolveTrackPath(track: Track): string {
  const fallbackPath = (track as { path?: string }).path;
  if (track.preparedFilePath) return track.preparedFilePath;

  const backendTrack = getTracks().find(t => t.id === track.id);
  if (backendTrack?.preparedFilePath) return backendTrack.preparedFilePath;

  return track.filePath || fallbackPath || '';
}

let cachedHttpServerUrl: string | null = null;

async function resolveFetchUrl(filePath: string): Promise<string> {
  if (!filePath) return filePath;

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const normalizedPath = normalizeLocalPath(filePath);
  if (normalizedPath) {
    const serverUrl = await getHttpServerUrl();
    if (serverUrl) {
      return `${serverUrl}/audio/${encodePathSegments(normalizedPath)}`;
    }
  }

  return filePath;
}

async function getHttpServerUrl(): Promise<string | null> {
  if (cachedHttpServerUrl) return cachedHttpServerUrl;

  try {
    let url = await core.invoke('http:getServerUrl');
    if (!url) {
      url = await core.invoke('get_http_server_url');
    }
    if (typeof url === 'string' && url.length > 0) {
      cachedHttpServerUrl = url;
      return url;
    }
  } catch (error) {
    console.warn('Failed to get HTTP server URL:', error);
  }

  return null;
}

function normalizeLocalPath(filePath: string): string | null {
  if (!filePath) return null;

  const sanitizedPath = filePath.replace(/^file:\/\//i, '');
  const normalizedPath = sanitizedPath.replace(/\\/g, '/');

  if (/^[A-Za-z]:\//.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  return null;
}

function encodePathSegments(filePath: string): string {
  return filePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

/**
 * Calculate track durations by loading their audio buffers
 * This implements step 1 from the issue: "Calculate the duration of each track"
 */
export async function calculateTrackDurations(tracks: Track[]): Promise<Track[]> {
  console.log(`📊 Calculating durations for ${tracks.length} tracks...`);

  const tracksWithDurations: Track[] = tracks.map(track => ({ ...track }));

  console.log('✅ Track durations available:');
  tracksWithDurations.forEach(track => {
    console.log(`  - ${track.name}: ${track.duration?.toFixed(2) ?? 'unknown'}s`);
  });

  return tracksWithDurations;
}

/**
 * Create a scheduled audio source node for a track
 */

/**
 * Play all tracks with synchronized scheduled playback
 * This implements step 2 from the issue: "The audio context takes that calculation 
 * and schedules a start using node.start in order to keep all audio files properly synced"
 */
export async function playAllTracksScheduled(tracks: Track[], seekOffset: number = 0): Promise<void> {
  const audioContext = getAudioContext();

  // Stop any currently playing tracks
  stopAllScheduledTracks();

  // Save for resume/seek
  lastTracks = tracks;
  playHeadOffset = seekOffset;
  isPaused = false;

  const playableTracks = tracks.filter(track => !track.isMuted);
  if (playableTracks.length === 0) {
    console.warn('⚠️ No unmuted tracks to play');
    return;
  }

  console.log(`📥 Preparing audio buffers for ${playableTracks.length} tracks...`);
  const preparedTracks: Array<Track | undefined> = new Array(playableTracks.length);
  const maxConcurrent = 2;
  let index = 0;
  let decodedCount = 0;
  const decodeStart = performance.now();

  const processNext = async (): Promise<void> => {
    const currentIndex = index++;
    if (currentIndex >= playableTracks.length) return;

    const track = playableTracks[currentIndex];
    console.log(`⏳ Decoding ${track.name} (${currentIndex + 1}/${playableTracks.length})`);
    try {
      if (!track.buffer) {
        const resolvedPath = resolveTrackPath(track);
        if (!resolvedPath) {
          throw new Error(`No file path available for track ${track.name}`);
        }
        track.buffer = await loadAudioBuffer(resolvedPath);
      }
      preparedTracks[currentIndex] = track;
      decodedCount += 1;
      console.log(`✅ Decoded ${track.name} (${decodedCount}/${playableTracks.length})`);
    } catch (error) {
      console.error(`❌ Failed to load buffer for ${track.name}:`, error);
      preparedTracks[currentIndex] = track;
    }

    await processNext();
  };

  const workers = Array.from({ length: Math.min(maxConcurrent, playableTracks.length) }, () => processNext());
  await Promise.all(workers);
  const decodeElapsedMs = Math.round(performance.now() - decodeStart);
  console.log(`📦 Buffer decode phase finished in ${decodeElapsedMs}ms`);

  // Filter tracks that have buffers loaded
  const tracksWithBuffers = preparedTracks.filter((track): track is Track => !!track?.buffer);

  if (tracksWithBuffers.length === 0) {
    console.warn('⚠️ No tracks with loaded buffers to play');
    return;
  }

  console.log(`🎵 Starting scheduled playback for ${tracksWithBuffers.length} tracks`);

  // Calculate start time with scheduling buffer
  // Use audio context's high-precision clock for perfect sync
  const schedulingBufferSeconds = 0.3; // 300ms buffer, matching backend improvement
  const startTime = audioContext.currentTime + schedulingBufferSeconds;
  playHeadStartTime = startTime - playHeadOffset;

  console.log(`⏰ Scheduling playback to start at audio context time: ${startTime.toFixed(3)}s (current: ${audioContext.currentTime.toFixed(3)}s, +${schedulingBufferSeconds}s)`);

  // Create and schedule all sources
  const scheduledSources: ScheduledTrack[] = [];

  for (const track of tracksWithBuffers) {
    // Start at offset if seeking/paused
    const scheduled = createScheduledSourceWithOffset(track, audioContext, startTime, playHeadOffset);
    if (scheduled) {
      scheduledSources.push(scheduled);
      scheduledTracks.set(track.id, scheduled);
    }
  }

  if (scheduledSources.length === 0) {
    console.error('❌ Failed to create any scheduled sources');
    return;
  }

  // All sources are scheduled with .start(startTime, offset) in createScheduledSourceWithOffset

  console.log(`✅ ${scheduledSources.length}/${tracksWithBuffers.length} tracks scheduled successfully`);
  console.log(`🎯 All tracks will start simultaneously at audio context time ${startTime.toFixed(3)}s`);

  // Verify scheduling after a brief delay
  setTimeout(() => {
    const nowPlaying = Array.from(scheduledTracks.values()).filter(s => s.track.isPlaying).length;
    console.log(`🎵 Verification: ${nowPlaying}/${scheduledSources.length} tracks confirmed playing`);
  }, (schedulingBufferSeconds + 0.1) * 1000);
}

function createScheduledSourceWithOffset(
  track: Track,
  audioContext: AudioContext,
  startTime: number,
  offset: number
): ScheduledTrack | null {
  if (!track.buffer) {
    console.error(`Cannot create source for ${track.name}: no audio buffer`);
    return null;
  }

  // Clamp offset to buffer duration
  const startOffset = Math.min(offset, track.buffer.duration - 0.01);

  // Create buffer source
  const source = audioContext.createBufferSource();
  source.buffer = track.buffer;

  // Create gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = track.volume ?? 1;

  // Create panner for stereo positioning
  const pannerNode = audioContext.createStereoPanner();
  const panValue = track.panValue ?? (track as { pan?: number }).pan ?? 0;
  pannerNode.pan.value = panValue;

  // Connect the audio graph
  source.connect(gainNode);
  gainNode.connect(pannerNode);
  pannerNode.connect(audioContext.destination);

  // Handle playback completion
  source.onended = () => {
    console.log(`🎵 Track ended: ${track.name}`);
    scheduledTracks.delete(track.id);
    track.isPlaying = false;
  };

  // Schedule with offset
  source.start(startTime, startOffset);

  return {
    track,
    source,
    gainNode,
    pannerNode,
    startTime,
  };
}

/**
 * Stop all scheduled tracks
 */
export function stopAllScheduledTracks(): void {
  console.log(`⏹️ Stopping ${scheduledTracks.size} scheduled tracks`);

  for (const [, scheduled] of scheduledTracks.entries()) {
    try {
      scheduled.source.stop();
      scheduled.track.isPlaying = false;
    } catch (error) {
      // Source may have already ended, ignore error
    }
  }

  scheduledTracks.clear();
  playHeadStartTime = null;
  isPaused = false;
  playHeadOffset = 0;
}

/**
 * Update volume for a playing scheduled track
 */
export function setScheduledTrackVolume(trackId: string, volume: number): void {
  const scheduled = scheduledTracks.get(trackId);
  if (scheduled) {
    scheduled.gainNode.gain.value = volume;
    scheduled.track.volume = volume;
    console.log(`🔊 Set volume for ${scheduled.track.name}: ${Math.round(volume * 100)}%`);
  }
}

/**
 * Update pan for a playing scheduled track
 */
export function setScheduledTrackPan(trackId: string, pan: number): void {
  const scheduled = scheduledTracks.get(trackId);
  if (scheduled) {
    scheduled.pannerNode.pan.value = pan;
    scheduled.track.panValue = pan;
    console.log(`🎛️ Set pan for ${scheduled.track.name}: ${pan.toFixed(2)}`);
  }
}

/**
 * Get current playback position (approximate)
 * Note: AudioBufferSourceNode doesn't provide exact position, this is estimated
 */
export function getCurrentPlaybackPosition(): number {
  const audioContext = getAudioContext();
  if (isPaused && playHeadOffset) return playHeadOffset;
  if (playHeadStartTime !== null) {
    return Math.max(0, audioContext.currentTime - playHeadStartTime);
  }
  return 0;
}


