/**
 * Frontend scheduled playback using Web Audio API
 * This module implements buffer scheduling with AudioBufferSourceNode.start(when)
 * to keep all audio files properly synced without backend dependency
 */

import { getAudioContext } from './audio-nodejs';
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

/**
 * Load an audio file into an AudioBuffer
 */
export async function loadAudioBuffer(filePath: string): Promise<AudioBuffer> {
  const audioContext = getAudioContext();
  
  try {
    console.log(`📥 Loading audio buffer: ${filePath}`);
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log(`✅ Audio buffer loaded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
    return audioBuffer;
  } catch (error) {
    console.error(`❌ Failed to load audio buffer for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Calculate track durations by loading their audio buffers
 * This implements step 1 from the issue: "Calculate the duration of each track"
 */
export async function calculateTrackDurations(tracks: Track[]): Promise<Track[]> {
  console.log(`📊 Calculating durations for ${tracks.length} tracks...`);
  
  const tracksWithDurations = await Promise.all(
    tracks.map(async (track) => {
      try {
        // Load the audio buffer to get accurate duration
        const buffer = await loadAudioBuffer(track.filePath);
        
        return {
          ...track,
          duration: buffer.duration,
          buffer: buffer, // Store buffer for playback
        };
      } catch (error) {
        console.error(`Failed to calculate duration for ${track.name}:`, error);
        return track; // Return track without duration on error
      }
    })
  );
  
  console.log('✅ Track durations calculated:');
  tracksWithDurations.forEach(track => {
    console.log(`  - ${track.name}: ${track.duration?.toFixed(2) ?? 'unknown'}s`);
  });
  
  return tracksWithDurations;
}

/**
 * Create a scheduled audio source node for a track
 */
function createScheduledSource(
  track: Track,
  audioContext: AudioContext,
  startTime: number
): ScheduledTrack | null {
  if (!track.buffer) {
    console.error(`Cannot create source for ${track.name}: no audio buffer`);
    return null;
  }
  
  // Create buffer source
  const source = audioContext.createBufferSource();
  source.buffer = track.buffer;
  
  // Create gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = track.volume;
  
  // Create panner for stereo positioning
  const pannerNode = audioContext.createStereoPanner();
  pannerNode.pan.value = track.panValue;
  
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
  
  return {
    track,
    source,
    gainNode,
    pannerNode,
    startTime,
  };
}

/**
 * Play all tracks with synchronized scheduled playback
 * This implements step 2 from the issue: "The audio context takes that calculation 
 * and schedules a start using node.start in order to keep all audio files properly synced"
 */
export async function playAllTracksScheduled(tracks: Track[]): Promise<void> {
  const audioContext = getAudioContext();
  
  // Stop any currently playing tracks
  stopAllScheduledTracks();
  
  // Filter tracks that have buffers loaded
  const tracksWithBuffers = tracks.filter(track => track.buffer && !track.isMuted);
  
  if (tracksWithBuffers.length === 0) {
    console.warn('⚠️ No tracks with loaded buffers to play');
    return;
  }
  
  console.log(`🎵 Starting scheduled playback for ${tracksWithBuffers.length} tracks`);
  
  // Calculate start time with scheduling buffer
  // Use audio context's high-precision clock for perfect sync
  const schedulingBufferSeconds = 0.3; // 300ms buffer, matching backend improvement
  const startTime = audioContext.currentTime + schedulingBufferSeconds;
  
  console.log(`⏰ Scheduling playback to start at audio context time: ${startTime.toFixed(3)}s (current: ${audioContext.currentTime.toFixed(3)}s, +${schedulingBufferSeconds}s)`);
  
  // Create and schedule all sources
  const scheduledSources: ScheduledTrack[] = [];
  
  for (const track of tracksWithBuffers) {
    const scheduled = createScheduledSource(track, audioContext, startTime);
    if (scheduled) {
      scheduledSources.push(scheduled);
      scheduledTracks.set(track.id, scheduled);
    }
  }
  
  if (scheduledSources.length === 0) {
    console.error('❌ Failed to create any scheduled sources');
    return;
  }
  
  // Start all sources at the exact same scheduled time
  // This is the key to preventing drift - all tracks receive the same start time
  const startPromises = scheduledSources.map(({ source, track }) => {
    return new Promise<void>((resolve) => {
      try {
        // Use AudioBufferSourceNode.start(when) for precise scheduling
        source.start(startTime);
        track.isPlaying = true;
        console.log(`✅ Scheduled ${track.name} to start at ${startTime.toFixed(3)}s`);
        resolve();
      } catch (error) {
        console.error(`❌ Failed to schedule ${track.name}:`, error);
        resolve();
      }
    });
  });
  
  await Promise.all(startPromises);
  
  console.log(`✅ ${scheduledSources.length}/${tracksWithBuffers.length} tracks scheduled successfully`);
  console.log(`🎯 All tracks will start simultaneously at audio context time ${startTime.toFixed(3)}s`);
  
  // Verify scheduling after a brief delay
  setTimeout(() => {
    const nowPlaying = Array.from(scheduledTracks.values()).filter(s => s.track.isPlaying).length;
    console.log(`🎵 Verification: ${nowPlaying}/${scheduledSources.length} tracks confirmed playing`);
  }, (schedulingBufferSeconds + 0.1) * 1000);
}

/**
 * Stop all scheduled tracks
 */
export function stopAllScheduledTracks(): void {
  console.log(`⏹️ Stopping ${scheduledTracks.size} scheduled tracks`);
  
  for (const [trackId, scheduled] of scheduledTracks.entries()) {
    try {
      scheduled.source.stop();
      scheduled.track.isPlaying = false;
    } catch (error) {
      // Source may have already ended, ignore error
    }
  }
  
  scheduledTracks.clear();
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
  
  // Find the first playing track to calculate position
  for (const scheduled of scheduledTracks.values()) {
    if (scheduled.track.isPlaying) {
      const elapsed = audioContext.currentTime - scheduled.startTime;
      return Math.max(0, elapsed);
    }
  }
  
  return 0;
}

/**
 * Check if any tracks are currently playing
 */
export function isPlayingScheduled(): boolean {
  return scheduledTracks.size > 0 && 
         Array.from(scheduledTracks.values()).some(s => s.track.isPlaying);
}
