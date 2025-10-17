// Song Transition Manager for HarmonySync
// Clean, focused implementation (no duplicated content)

import { loadSongTracksForStreaming } from './streaming-audio.js';
import { getAudioContext, getTracks } from './audio.js';

class SongTransitionManager {
  constructor() {
    this.isTransitioning = false;
    this.currentSong = null;
    this.preloadedSongs = new Map();
    this.transitionDuration = 3000;
    this.fadeType = 'logarithmic';
  }

  setTransitionSettings(duration = 3000, fadeType = 'logarithmic') {
    this.transitionDuration = duration;
    this.fadeType = fadeType;
  }

  async preloadNextSong(songDetails) {
    try {
      const streamingTracks = await loadSongTracksForStreaming(songDetails.tracks || []);
      const tracks = streamingTracks.map(t => ({ buffer: t.buffer || null, audioEl: t.audioEl || null, name: t.name, filePath: t.filePath, individualVolume: 0.7, panValue: 0 }));
      this.preloadedSongs.set(songDetails.id || songDetails.path || Date.now(), { details: songDetails, tracks, loadedAt: Date.now() });
      return tracks;
    } catch (err) {
      console.error('preloadNextSong error', err);
      return null;
    }
  }

  async transitionToSong(songDetails, transitionType = 'crossfade') {
    if (this.isTransitioning) return false;
    this.isTransitioning = true;
    try {
      const currentTracks = getTracks();
      let nextTracks = this.preloadedSongs.has(songDetails.id) ? this.preloadedSongs.get(songDetails.id).tracks : (await loadSongTracksForStreaming(songDetails.tracks || []));
      if (transitionType === 'cut') await this.performCut(currentTracks, nextTracks);
      else await this.performCrossfade(currentTracks, nextTracks);
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

  async performCrossfade(currentTracks, nextTracks) {
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
          if (!track.source) {
            track.source = audioContext.createMediaElementSource(track.audioEl);
            track.gainNode = audioContext.createGain();
            track.pannerNode = audioContext.createStereoPanner();
            track.source.connect(track.gainNode);
            track.gainNode.connect(track.pannerNode);
            track.pannerNode.connect(audioContext.destination);
          }
          track.gainNode.gain.value = 0;
          track.pannerNode.pan.value = track.panValue || 0;
          try { track.audioEl.currentTime = 0; } catch (e) {}
          track.audioEl.play().catch(()=>{});
          track.isPlaying = true;
        }
      } catch (e) { console.warn('crossfade setup', e); }
    });

    const fadeSteps = 50;
    const stepDuration = this.transitionDuration / fadeSteps;
    for (let i = 0; i <= fadeSteps; i++) {
      const progress = i / fadeSteps;
      const fadeOut = this.calculateFadeValue(1 - progress);
      const fadeIn = this.calculateFadeValue(progress);
      setTimeout(() => {
        currentTracks.forEach(track => { if (track.gainNode && track.gainNode.context === audioContext) track.gainNode.gain.value = fadeOut * (track.individualVolume || 1); });
        nextTracks.forEach(track => { if (track.gainNode && track.gainNode.context === audioContext) track.gainNode.gain.value = fadeIn * (track.individualVolume || 1); });
        if (i === fadeSteps) this.completeTransition(currentTracks, nextTracks);
      }, i * stepDuration);
    }
  }

  async performCut(currentTracks, nextTracks) {
    currentTracks.forEach(track => { try { if (track.source) track.source.stop(); } catch(e){} track.isPlaying = false; });
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
      } else if (track.audioEl) { try { track.audioEl.currentTime = 0; track.audioEl.play().catch(()=>{}); } catch(e){} }
    });
    this.completeTransition(currentTracks, nextTracks);
  }

  calculateFadeValue(progress) {
    switch (this.fadeType) {
      case 'linear': return progress;
      case 'logarithmic': return Math.pow(progress, 2);
      case 'scurve': return 3 * Math.pow(progress,2) - 2 * Math.pow(progress,3);
      default: return progress;
    }
  }

  async fadeTracksOut(tracks, duration) {
    const audioContext = getAudioContext();
    return new Promise(resolve => {
      const steps = 30; const stepDuration = duration / steps;
      for (let i=0;i<=steps;i++) setTimeout(()=>{ const v=this.calculateFadeValue(1-(i/steps)); tracks.forEach(t=>{ if (t.gainNode && t.gainNode.context===audioContext) t.gainNode.gain.value = v * (t.individualVolume||1); }); if (i===steps) resolve(); }, i * stepDuration);
    });
  }

  async fadeTracksIn(tracks, duration) {
    const audioContext = getAudioContext();
    tracks.forEach(t=>{ if (t.buffer) { t.source = audioContext.createBufferSource(); t.source.buffer = t.buffer; t.gainNode = audioContext.createGain(); t.pannerNode = audioContext.createStereoPanner(); t.gainNode.gain.value = 0; t.pannerNode.pan.value = t.panValue||0; t.source.connect(t.gainNode); t.gainNode.connect(t.pannerNode); t.pannerNode.connect(audioContext.destination); t.source.start(); } });
    return new Promise(resolve=>{ const steps=30; const stepDuration=duration/steps; for (let i=0;i<=steps;i++) setTimeout(()=>{ const v=this.calculateFadeValue(i/steps); tracks.forEach(t=>{ if (t.gainNode && t.gainNode.context===audioContext) t.gainNode.gain.value = v * (t.individualVolume||1); }); if (i===steps) resolve(); }, i*stepDuration); });
  }

  completeTransition(oldTracks, newTracks) { const globalTracks = getTracks(); globalTracks.length = 0; newTracks.forEach(t=>globalTracks.push(t)); }

  cleanupOldPreloads() { const maxAge = 1000 * 60 * 5; const now = Date.now(); for (const [id, data] of this.preloadedSongs.entries()) { if (now - data.loadedAt > maxAge) this.preloadedSongs.delete(id); } }
}

export const songTransitionManager = new SongTransitionManager();
export { SongTransitionManager };