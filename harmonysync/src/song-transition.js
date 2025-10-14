// Song Transition Manager for HarmonySync
// Handles smooth crossfading between songs and tracks

import { loadSongTracksForStreaming } from './streaming-audio.js';
import { getAudioContext, getTracks, stopAllAudio, cleanupAudio } from './audio.js';

class SongTransitionManager {
  constructor() {
    this.isTransitioning = false;
    this.currentSong = null;
    this.nextSong = null;
    this.preloadedSongs = new Map(); // Cache for preloaded songs
    this.transitionDuration = 3000; // 3 seconds default
    this.fadeType = 'logarithmic'; // 'linear', 'logarithmic', 'scurve'
  }

  // Set transition preferences
  setTransitionSettings(duration = 3000, fadeType = 'logarithmic') {
    this.transitionDuration = duration;
    this.fadeType = fadeType;
  }

  // Preload the next song for instant switching
  async preloadNextSong(songDetails) {
    console.log('Preloading next song:', songDetails.title);
    
    try {
      // Load tracks for the next song
      const streamingTracks = await loadSongTracksForStreaming(songDetails.tracks);
      
      // Convert to our track format - streamingTrack may now be a media element wrapper
      const tracks = streamingTracks.map(streamingTrack => ({
        // If streamingTrack has an AudioBuffer, keep it in `buffer`; otherwise it may have `audioEl`.
        buffer: streamingTrack.buffer || null,
        audioEl: streamingTrack.audioEl || null,
        source: null,
        gainNode: null, // Will be created during transition with correct context
        pannerNode: null, // Will be created during transition with correct context
        isPlaying: false,
        isMuted: false,
        startTime: 0,
        offset: 0,
        path: streamingTrack.filePath,
        name: streamingTrack.name,
        panValue: 0,
        individualVolume: 0.7,
      }));

      // Store preloaded song
      this.preloadedSongs.set(songDetails.id, {
        details: songDetails,
        tracks,
        loadedAt: Date.now()
      });

      console.log(`Successfully preloaded ${tracks.length} tracks for ${songDetails.title}`);
      return tracks;
    } catch (error) {
      console.error('Error preloading next song:', error);
      return null;
    }
  }

  // Smooth transition to next song with crossfade
  async transitionToSong(songDetails, transitionType = 'crossfade') {
    if (this.isTransitioning) {
      console.warn('Transition already in progress');
      return false;
    }

    this.isTransitioning = true;
    console.log(`Starting ${transitionType} transition to:`, songDetails.title);
    
    // Debug: Check audio context status
    const audioContext = getAudioContext();
    console.log('Audio context state:', audioContext.state);
    console.log('Audio context sample rate:', audioContext.sampleRate);

    try {
      // Get current tracks
      const currentTracks = getTracks();
      console.log('Current tracks count:', currentTracks.length);
      
      // Validate current tracks have proper audio context
      currentTracks.forEach((track, index) => {
        if (track.gainNode && track.gainNode.context !== audioContext) {
          console.warn(`Track ${index} has stale audio context, recreating nodes`);
          // Recreate nodes for current tracks too
          if (track.source && track.source.buffer) {
            track.gainNode = audioContext.createGain();
            track.pannerNode = audioContext.createStereoPanner();
            track.gainNode.gain.value = track.individualVolume || 0.7;
            track.pannerNode.pan.value = track.panValue || 0;
          }
        }
      });
      
      // Get or load next song tracks
      let nextTracks;
      if (this.preloadedSongs.has(songDetails.id)) {
        console.log('Using preloaded tracks');
        nextTracks = this.preloadedSongs.get(songDetails.id).tracks;
      } else {
        console.log('Loading tracks on-demand');
        const streamingTracks = await loadSongTracksForStreaming(songDetails.tracks);
        nextTracks = streamingTracks.map(streamingTrack => ({
          buffer: streamingTrack.buffer || null,
          audioEl: streamingTrack.audioEl || null,
          source: null,
          gainNode: null,
          pannerNode: null,
          isPlaying: false,
          isMuted: false,
          startTime: 0,
          offset: 0,
          path: streamingTrack.filePath,
          name: streamingTrack.name,
          panValue: 0,
          individualVolume: 0.7,
        }));
      }

      // Perform transition based on type
      switch (transitionType) {
        case 'crossfade':
          await this.performCrossfade(currentTracks, nextTracks);
          break;
        case 'cut':
          await this.performCut(currentTracks, nextTracks);
          break;
        case 'fadeout-fadein':
          await this.performFadeOutFadeIn(currentTracks, nextTracks);
          break;
        default:
          await this.performCrossfade(currentTracks, nextTracks);
      }

      // Update current song reference
      this.currentSong = songDetails;
      
      // Clean up old preloaded songs (keep only current + 1 next)
      this.cleanupOldPreloads();

      console.log('Transition completed successfully');
      return true;

    } catch (error) {
      console.error('Error during song transition:', error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  // Crossfade implementation
  async performCrossfade(currentTracks, nextTracks) {
    const audioContext = getAudioContext();
    const startTime = audioContext.currentTime;
    const endTime = startTime + (this.transitionDuration / 1000);

    // Start playing next tracks at 0 volume
    nextTracks.forEach(track => {
      if (track.buffer) {
        try {
          // Recreate all audio nodes with current context to avoid context mismatch
          track.source = audioContext.createBufferSource();
          track.source.buffer = track.buffer;
          
          // Recreate gain and panner nodes with current context
          track.gainNode = audioContext.createGain();
          track.pannerNode = audioContext.createStereoPanner();
          
          track.gainNode.gain.value = 0; // Start silent
          track.pannerNode.pan.value = track.panValue || 0; // Restore pan value
          
          // Connect audio graph: source -> gain -> panner -> destination
          track.source.connect(track.gainNode);
          track.gainNode.connect(track.pannerNode);
          track.pannerNode.connect(audioContext.destination);
          
          track.source.start(startTime);
          track.isPlaying = true;
        } catch (error) {
          console.error('Error setting up track for crossfade:', error);
        }
      } else if (track.audioEl) {
        try {
          // For media elements, create MediaElementSource and connect to gain/panner
          track.source = audioContext.createMediaElementSource(track.audioEl);
          track.gainNode = audioContext.createGain();
          track.pannerNode = audioContext.createStereoPanner();

          track.gainNode.gain.value = 0;
          track.pannerNode.pan.value = track.panValue || 0;

          track.source.connect(track.gainNode);
          track.gainNode.connect(track.pannerNode);
          track.pannerNode.connect(audioContext.destination);

          // Ensure element is at start and play
          try { track.audioEl.currentTime = 0; } catch (e) {}
          track.audioEl.play().catch(e => console.warn('Media element play() failed:', e));
          track.isPlaying = true;
        } catch (error) {
          console.error('Error setting up media element for crossfade:', error);
        }
      }
    });

    // Create fade curves
    const fadeSteps = 100;
    const stepDuration = this.transitionDuration / fadeSteps;

    for (let i = 0; i <= fadeSteps; i++) {
      const progress = i / fadeSteps;
      const fadeOutValue = this.calculateFadeValue(1 - progress);
      const fadeInValue = this.calculateFadeValue(progress);
      
      setTimeout(() => {
        // Fade out current tracks
        currentTracks.forEach(track => {
          if (track.gainNode && track.gainNode.context === audioContext) {
            track.gainNode.gain.value = fadeOutValue * track.individualVolume;
          } else if (track.gainNode) {
            console.warn('Skipping fade for track with stale audio context');
          }
        });

        // Fade in next tracks  
        nextTracks.forEach(track => {
          if (track.gainNode && track.gainNode.context === audioContext) {
            track.gainNode.gain.value = fadeInValue * track.individualVolume;
          }
        });

        // Complete transition
        if (i === fadeSteps) {
          this.completeTransition(currentTracks, nextTracks);
        }
      }, i * stepDuration);
    }
  }

  // Hard cut transition
  async performCut(currentTracks, nextTracks) {
    // Stop current tracks immediately
    currentTracks.forEach(track => {
      if (track.source) {
        track.source.stop();
        track.isPlaying = false;
      }
    });

    // Start next tracks immediately at full volume
    const audioContext = getAudioContext();
    nextTracks.forEach(track => {
      if (track.buffer) {
        // Recreate all audio nodes with current context
        track.source = audioContext.createBufferSource();
        track.source.buffer = track.buffer;
        
        track.gainNode = audioContext.createGain();
        track.pannerNode = audioContext.createStereoPanner();
        
        track.gainNode.gain.value = track.individualVolume;
        track.pannerNode.pan.value = track.panValue || 0;
        
        track.source.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(audioContext.destination);
        
        track.source.start();
        track.isPlaying = true;
      }
    });

    this.completeTransition(currentTracks, nextTracks);
  }

  // Fade out then fade in
  async performFadeOutFadeIn(currentTracks, nextTracks) {
    const halfDuration = this.transitionDuration / 2;
    
    // First half: Fade out current
    await this.fadeTracksOut(currentTracks, halfDuration);
    
    // Stop current tracks
    currentTracks.forEach(track => {
      if (track.source) {
        track.source.stop();
        track.isPlaying = false;
      }
    });

    // Second half: Fade in next
    await this.fadeTracksIn(nextTracks, halfDuration);
    
    this.completeTransition(currentTracks, nextTracks);
  }

  // Calculate fade value based on fade type
  calculateFadeValue(progress) {
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

  // Helper to fade tracks out
  async fadeTracksOut(tracks, duration) {
    const audioContext = getAudioContext();
    return new Promise(resolve => {
      const steps = 50;
      const stepDuration = duration / steps;
      
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const fadeValue = this.calculateFadeValue(1 - (i / steps));
          tracks.forEach(track => {
            if (track.gainNode && track.gainNode.context === audioContext) {
              track.gainNode.gain.value = fadeValue * track.individualVolume;
            }
          });
          
          if (i === steps) resolve();
        }, i * stepDuration);
      }
    });
  }

  // Helper to fade tracks in
  async fadeTracksIn(tracks, duration) {
    const audioContext = getAudioContext();
    
    // Start tracks at 0 volume
    tracks.forEach(track => {
      if (track.buffer) {
        // Recreate all audio nodes with current context
        track.source = audioContext.createBufferSource();
        track.source.buffer = track.buffer;
        
        track.gainNode = audioContext.createGain();
        track.pannerNode = audioContext.createStereoPanner();
        
        track.gainNode.gain.value = 0;
        track.pannerNode.pan.value = track.panValue || 0;
        
        track.source.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(audioContext.destination);
        
        track.source.start();
        track.isPlaying = true;
      }
    });

    return new Promise(resolve => {
      const steps = 50;
      const stepDuration = duration / steps;
      const audioContext = getAudioContext();
      
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const fadeValue = this.calculateFadeValue(i / steps);
          tracks.forEach(track => {
            if (track.gainNode && track.gainNode.context === audioContext) {
              track.gainNode.gain.value = fadeValue * track.individualVolume;
            }
          });
          
          if (i === steps) resolve();
        }, i * stepDuration);
      }
    });
  }

  // Complete the transition by updating track arrays
  completeTransition(oldTracks, newTracks) {
    // Clear old tracks from global array
    const globalTracks = getTracks();
    globalTracks.length = 0;
    
    // Add new tracks to global array
    newTracks.forEach(track => globalTracks.push(track));
    
    console.log('Transition completed, updated global tracks');
  }

  // Clean up old preloaded songs to manage memory
  cleanupOldPreloads() {
    const maxAge = 300000; // 5 minutes
    const now = Date.now();
    
    for (const [songId, data] of this.preloadedSongs.entries()) {
      if (now - data.loadedAt > maxAge) {
        this.preloadedSongs.delete(songId);
        console.log(`Cleaned up preloaded song: ${data.details.title}`);
      }
    }
  }

  // Quick transition for live performance (minimal delay)
  async quickTransition(songDetails) {
    if (this.preloadedSongs.has(songDetails.id)) {
      return await this.transitionToSong(songDetails, 'cut');
    } else {
      console.warn('Song not preloaded, transition may have delay');
      return await this.transitionToSong(songDetails, 'crossfade');
    }
  }

  // Get transition status
  getStatus() {
    return {
      isTransitioning: this.isTransitioning,
      currentSong: this.currentSong,
      preloadedCount: this.preloadedSongs.size,
      transitionDuration: this.transitionDuration,
      fadeType: this.fadeType
    };
  }
}

// Export singleton instance
export const songTransitionManager = new SongTransitionManager();

// Export class for testing/multiple instances
export { SongTransitionManager };