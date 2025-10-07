import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core'; // Re-add TauriCore import

let audioContext = null;
let gainNode = null;
const audioSources = []; // To keep track of all active audio sources
const audioBufferCache = new Map(); // Cache for audio buffers

let tracks = []; // Array to hold track objects

export function getTracks() {
  return tracks;
}

export function clearTracks() {
  tracks = [];
}

export function clearAudioBufferCache() {
  audioBufferCache.clear();
}

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain(); // Re-create gainNode here
    gainNode.connect(audioContext.destination);
    console.log('AudioContext initialized.');
  }
  return audioContext;
}

function getGainNode() {
  // Ensure audio context and gain node are initialized
  getAudioContext();
  return gainNode;
}

export function stopAllAudio() {
  audioSources.forEach(source => {
    try {
      source.stop();
      source.disconnect(); // Disconnect the source from the gain node
    } catch (e) {
      console.warn("Error stopping or disconnecting audio source:", e);
    }
  });
  audioSources.length = 0; // Clear the array
}

export function cleanupAudio() {
  stopAllAudio(); // Stop all playing tracks and disconnect their sources
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().then(() => {
      console.log("AudioContext closed successfully.");
      audioContext = null;
      gainNode = null; // Also nullify gainNode here
    }).catch((e) => {
      console.error("Error closing AudioContext:", e);
      audioContext = null;
      gainNode = null; // Also nullify gainNode on error
    });
  } else {
    audioContext = null; // Ensure it's null even if it was already closed or never initialized
    gainNode = null; // Also nullify gainNode
  }
  audioBufferCache.clear(); // Clear the audio buffer cache
}

export function setPan(track, panValue) {
  if (track && track.pannerNode) {
    track.pannerNode.pan.value = panValue;
    track.panValue = panValue;
  }
}

export async function loadAudioFile(path) {
  if (audioBufferCache.has(path)) {
    return audioBufferCache.get(path);
  }

  try {
    const audioContext = getAudioContext();
    const assetUrl = TauriCore.convertFileSrc(path); // Use convertFileSrc again
    console.log("Attempting to fetch assetUrl:", assetUrl); // Debugging line
    const response = await fetch(assetUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBufferCache.set(path, audioBuffer);
    return audioBuffer;
  } catch (error) {
    console.error(`Error loading or decoding audio file ${path}:`, error);
    return null;
  }
}

export function playAllTracks() {
  const currentAudioContext = getAudioContext();
  const currentTracks = getTracks();

  if (!currentAudioContext || currentTracks.length === 0) return;

  currentTracks.forEach(track => {
    if (!track.isPlaying) {
      const source = currentAudioContext.createBufferSource();
      source.buffer = track.buffer;

      source.connect(track.pannerNode);
      track.pannerNode.connect(track.gainNode);
      track.gainNode.connect(getGainNode());

      source.start(0, track.offset);
      track.startTime = currentAudioContext.currentTime - track.offset;
      track.isPlaying = true;
      track.source = source;
      audioSources.push(source);

      source.onended = () => {
        track.isPlaying = false;
        track.offset = 0; // Reset offset when track ends
        const index = audioSources.indexOf(source);
        if (index > -1) {
          audioSources.splice(index, 1);
        }
      };
    }
  });
}

function goToBeginningAllTracks() {
  const currentAudioContext = getAudioContext();
  const currentTracks = getTracks();

  if (!currentAudioContext || currentTracks.length === 0) return;

  stopAllTracks();
  currentTracks.forEach(track => {
    track.offset = 0;
  });
}

function applyDefaultPanning() {
  const currentTracks = getTracks();
  let hasClickOrGuide = false;
  currentTracks.forEach(track => {
    const lowerCaseName = track.name.toLowerCase();
    if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
      hasClickOrGuide = true;
    }
  });

  currentTracks.forEach(track => {
    const lowerCaseName = track.name.toLowerCase();
    let panValue = 0; // Default to center

    if (hasClickOrGuide) {
      if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
        panValue = -1; // Hard left
      } else {
        panValue = 1; // Hard right
      }
    } else {
      panValue = 0; // Center
    }
    setPan(track, panValue);
  });
}

let globalVolume = 1; // New variable to store global volume

function setGlobalVolume(volume) {
  globalVolume = volume;
  const currentTracks = getTracks();
  currentTracks.forEach(track => {
    if (track.gainNode) {
      // Apply global volume in addition to individual track volume (if any)
      // For simplicity, let's assume individual track volume is 0.7 if not muted
      track.gainNode.gain.value = track.isMuted ? 0 : globalVolume * (track.individualVolume || 0.7);
    }
  });
}

export {
    getAudioContext,
    goToBeginningAllTracks,
    applyDefaultPanning,
    setGlobalVolume // Export the new function
}