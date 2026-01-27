// Song Transition Manager for HarmonySync
// Clean, focused implementation (no duplicated content)

import { loadSongTracksForStreaming } from './streaming-audio';
import { getAudioContext, getTracks } from './audio-nodejs';
import type { SongDetails, Track, FadeType, TransitionType, PreloadedSong } from '../../types/audio';

class SongTransitionManager {
  private isTransitioning = false;
  private currentSong: SongDetails | null = null;
  private preloadedSongs: Map<string | number, PreloadedSong> = new Map();
  private transitionDuration = 3000;
  private fadeType: FadeType = 'logarithmic';

  setTransitionSettings(duration = 3000, fadeType: FadeType = 'logarithmic'): void {
    this.transitionDuration = duration;
    this.fadeType = fadeType;
  }

  async preloadNextSong(songDetails: SongDetails): Promise<Track[] | null> {
    try {
      const streamingTracks = await loadSongTracksForStreaming(songDetails.tracks || []);
      const tracks: Track[] = streamingTracks.map(t => ({
        ...t,
        buffer: t.buffer || null,
        audioEl: t.audioEl || null,
        individualVolume: 0.7,
        panValue: 0
      }));
      const songId = songDetails.id || songDetails.path || Date.now();
      this.preloadedSongs.set(songId, {
        details: songDetails,
        tracks,
        loadedAt: Date.now()
      });
      return tracks;
    } catch (err) {
      console.error('preloadNextSong error', err);
      return null;
    }
  }

  async transitionToSong(songDetails: SongDetails, transitionType: TransitionType = 'crossfade'): Promise<boolean> {
    if (this.isTransitioning) return false;
    this.isTransitioning = true;
    try {
      const currentTracks = getTracks();
      const songId = songDetails.id || songDetails.path || '';
      let nextTracks: Track[];
      
      if (this.preloadedSongs.has(songId)) {
        nextTracks = this.preloadedSongs.get(songId)!.tracks;
      } else {
        nextTracks = await loadSongTracksForStreaming(songDetails.tracks || []);
      }
      
      if (transitionType === 'cut') {
        await this.performCut(currentTracks, nextTracks);
      } else {
        await this.performCrossfade(currentTracks, nextTracks);
      }
      
      this.currentSong = songDetails;
      this.cleanupOldPreloads();
      return true;
    } catch (err) {
      console.error('transitionToSong error', err);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  private async performCrossfade(currentTracks: Track[], nextTracks: Track[]): Promise<void> {
    const audioContext = getAudioContext();
    const startTime = audioContext.currentTime;
    
    nextTracks.forEach(track => {
      try {
        if (track.buffer) {
          track.source = audioContext.createBufferSource();
          track.source.buffer = track.buffer;
          track.gainNode = audioContext.createGain();
          track.pannerNode = audioContext.createStereoPanner();
          track.gainNode.gain.value = 0;
          track.pannerNode.pan.value = track.panValue || 0;
          track.source.connect(track.gainNode);
          track.gainNode.connect(track.pannerNode);
          track.pannerNode.connect(audioContext.destination);
          track.source.start(startTime);
          track.isPlaying = true;
        } else if (track.audioEl) {
          track.source = audioContext.createMediaElementSource(track.audioEl);
          track.gainNode = audioContext.createGain();
          track.pannerNode = audioContext.createStereoPanner();
          track.gainNode.gain.value = 0;
          track.pannerNode.pan.value = track.panValue || 0;
          track.source.connect(track.gainNode);
          track.gainNode.connect(track.pannerNode);
          track.pannerNode.connect(audioContext.destination);
          try { 
            track.audioEl.currentTime = 0; 
          } catch (e) {
            // Ignore timing errors
          }
          track.audioEl.play().catch(() => {
            // Ignore play errors
          });
          track.isPlaying = true;
        }
      } catch (e) {
        console.warn('crossfade setup', e);
      }
    });

    const fadeSteps = 50;
    const stepDuration = this.transitionDuration / fadeSteps;
    
    for (let i = 0; i <= fadeSteps; i++) {
      const progress = i / fadeSteps;
      const fadeOut = this.calculateFadeValue(1 - progress);
      const fadeIn = this.calculateFadeValue(progress);
      
      setTimeout(() => {
        currentTracks.forEach(track => {
          if (track.gainNode && track.gainNode.context === audioContext) {
            track.gainNode.gain.value = fadeOut * (track.individualVolume || 1);
          }
        });
        nextTracks.forEach(track => {
          if (track.gainNode && track.gainNode.context === audioContext) {
            track.gainNode.gain.value = fadeIn * (track.individualVolume || 1);
          }
        });
        if (i === fadeSteps) {
          this.completeTransition(currentTracks, nextTracks);
        }
      }, i * stepDuration);
    }
  }

  private async performCut(currentTracks: Track[], nextTracks: Track[]): Promise<void> {
    currentTracks.forEach(track => {
      try {
        if (track.source && 'stop' in track.source) {
          (track.source as AudioBufferSourceNode).stop();
        }
      } catch (e) {
        // Ignore stop errors
      }
      track.isPlaying = false;
    });
    
    const audioContext = getAudioContext();
    nextTracks.forEach(track => {
      if (track.buffer) {
        track.source = audioContext.createBufferSource();
        track.source.buffer = track.buffer;
        track.gainNode = audioContext.createGain();
        track.pannerNode = audioContext.createStereoPanner();
        track.gainNode.gain.value = track.individualVolume || 1;
        track.pannerNode.pan.value = track.panValue || 0;
        track.source.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(audioContext.destination);
        track.source.start();
        track.isPlaying = true;
      } else if (track.audioEl) {
        try {
          track.audioEl.currentTime = 0;
          track.audioEl.play().catch(() => {
            // Ignore play errors
          });
        } catch (e) {
          // Ignore timing errors
        }
      }
    });
    this.completeTransition(currentTracks, nextTracks);
  }

  private calculateFadeValue(progress: number): number {
    switch (this.fadeType) {
      case 'linear':
        return progress;
      case 'logarithmic':
        return Math.pow(progress, 2);
      case 'scurve':
        return 3 * Math.pow(progress, 2) - 2 * Math.pow(progress, 3);
      default:
        return progress;
    }
  }

  async fadeTracksOut(tracks: Track[], duration: number): Promise<void> {
    const audioContext = getAudioContext();
    return new Promise(resolve => {
      const steps = 30;
      const stepDuration = duration / steps;
      
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const v = this.calculateFadeValue(1 - (i / steps));
          tracks.forEach(t => {
            if (t.gainNode && t.gainNode.context === audioContext) {
              t.gainNode.gain.value = v * (t.individualVolume || 1);
            }
          });
          if (i === steps) resolve();
        }, i * stepDuration);
      }
    });
  }

  async fadeTracksIn(tracks: Track[], duration: number): Promise<void> {
    const audioContext = getAudioContext();
    tracks.forEach(t => {
      if (t.buffer) {
        t.source = audioContext.createBufferSource();
        t.source.buffer = t.buffer;
        t.gainNode = audioContext.createGain();
        t.pannerNode = audioContext.createStereoPanner();
        t.gainNode.gain.value = 0;
        t.pannerNode.pan.value = t.panValue || 0;
        t.source.connect(t.gainNode);
        t.gainNode.connect(t.pannerNode);
        t.pannerNode.connect(audioContext.destination);
        t.source.start();
      }
    });
    
    return new Promise(resolve => {
      const steps = 30;
      const stepDuration = duration / steps;
      
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const v = this.calculateFadeValue(i / steps);
          tracks.forEach(t => {
            if (t.gainNode && t.gainNode.context === audioContext) {
              t.gainNode.gain.value = v * (t.individualVolume || 1);
            }
          });
          if (i === steps) resolve();
        }, i * stepDuration);
      }
    });
  }

  private completeTransition(oldTracks: Track[], newTracks: Track[]): void {
    const globalTracks = getTracks();
    globalTracks.length = 0;
    newTracks.forEach(t => globalTracks.push(t));
  }

  private cleanupOldPreloads(): void {
    const maxAge = 1000 * 60 * 5; // 5 minutes
    const now = Date.now();
    for (const [id, data] of this.preloadedSongs.entries()) {
      if (now - data.loadedAt > maxAge) {
        this.preloadedSongs.delete(id);
      }
    }
  }
}

export const songTransitionManager = new SongTransitionManager();
export { SongTransitionManager };
