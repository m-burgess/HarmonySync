import * as TauriFs from '@tauri-apps/plugin-fs';

let audioContext;
let audioBufferCache = new Map(); // Cache for AudioBuffer objects
let tracks = []; // Stores { buffer, source, gainNode, pannerNode, isPlaying, startTime, offset, path, name, panValue }
let isPlayingAll = false;
let lastPlayTime = 0;

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function getTracks() {
  return tracks;
}

function clearAudioBufferCache() {
  audioBufferCache.clear();
}

function clearTracks() {
  tracks.length = 0;
}

async function loadAudioFile(path) {
  const currentAudioContext = getAudioContext();

  if (audioBufferCache.has(path)) {
    return audioBufferCache.get(path);
  }

  try {
    const binaryData = await TauriFs.readFile(path);
    const audioBuffer = await currentAudioContext.decodeAudioData(binaryData.buffer);
    audioBufferCache.set(path, audioBuffer);
    return audioBuffer;
  } catch (error) {
    console.error('Error loading audio file:', path, error);
    return null;
  }
}

function setPan(track, panValue) {
  if (track.pannerNode) {
    track.pannerNode.pan.value = panValue;
    track.panValue = panValue;
  }
}

function playAllTracks() {
  const currentAudioContext = getAudioContext();
  const currentTracks = getTracks();

  if (!currentAudioContext || currentTracks.length === 0) return;

  if (currentAudioContext.state === 'suspended') {
    currentAudioContext.resume();
  }

  if (!isPlayingAll) {
    lastPlayTime = currentAudioContext.currentTime;
    currentTracks.forEach(track => {
      if (track.source) {
        track.source.stop();
        track.source = null;
      }

      track.source = currentAudioContext.createBufferSource();
      track.source.buffer = track.buffer;

      track.gainNode = currentAudioContext.createGain();
      track.pannerNode = currentAudioContext.createStereoPanner();

      track.source.connect(track.gainNode);
      track.gainNode.connect(track.pannerNode);
      track.pannerNode.connect(currentAudioContext.destination);

      track.gainNode.gain.value = track.isMuted ? 0 : 0.7; // Set initial gain based on mute state and default volume
      setPan(track, track.panValue || 0); // Apply current pan value

      track.source.start(0, track.offset);
      track.isPlaying = true;
    });
    isPlayingAll = true;
  }
}

function stopAllTracks() {
  const currentAudioContext = getAudioContext();
  const currentTracks = getTracks();

  if (!currentAudioContext || currentTracks.length === 0) return;

  currentTracks.forEach(track => {
    if (track.source && track.isPlaying) {
      track.source.stop();
      track.source = null;
      track.isPlaying = false;
      track.offset += currentAudioContext.currentTime - lastPlayTime;
    }
  });
  isPlayingAll = false;
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

export {
    getAudioContext,
    getTracks,
    clearAudioBufferCache,
    clearTracks,
    loadAudioFile,
    setPan,
    playAllTracks,
    stopAllTracks,
    goToBeginningAllTracks,
    applyDefaultPanning
}