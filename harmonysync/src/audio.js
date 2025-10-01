import * as TauriFs from '@tauri-apps/plugin-fs';

let audioContext;
let tracks = []; // Stores { buffer, source, gainNode, pannerNode, isPlaying, startTime, offset, path, name, panValue }
let isPlayingAll = false;
let lastPlayTime = 0;

async function loadAudioFile(path) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const binaryData = await TauriFs.readFile(path);
    const audioBuffer = await audioContext.decodeAudioData(binaryData.buffer);
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
  if (!audioContext || tracks.length === 0) return;

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  if (!isPlayingAll) {
    lastPlayTime = audioContext.currentTime;
    tracks.forEach(track => {
      if (track.source) {
        track.source.stop();
        track.source = null;
      }

      track.source = audioContext.createBufferSource();
      track.source.buffer = track.buffer;

      track.gainNode = audioContext.createGain();
      track.pannerNode = audioContext.createStereoPanner();

      track.source.connect(track.gainNode);
      track.gainNode.connect(track.pannerNode);
      track.pannerNode.connect(audioContext.destination);

      track.gainNode.gain.value = track.isMuted ? 0 : 0.7; // Set initial gain based on mute state and default volume
      setPan(track, track.panValue || 0); // Apply current pan value

      track.source.start(0, track.offset);
      track.isPlaying = true;
    });
    isPlayingAll = true;
  }
}

function stopAllTracks() {
  if (!audioContext || tracks.length === 0) return;

  tracks.forEach(track => {
    if (track.source && track.isPlaying) {
      track.source.stop();
      track.source = null;
      track.isPlaying = false;
      track.offset += audioContext.currentTime - lastPlayTime;
    }
  });
  isPlayingAll = false;
}

function goToBeginningAllTracks() {
  if (!audioContext || tracks.length === 0) return;

  stopAllTracks();
  tracks.forEach(track => {
    track.offset = 0;
  });
}

function applyDefaultPanning() {
  let hasClickOrGuide = false;
  tracks.forEach(track => {
    const lowerCaseName = track.name.toLowerCase();
    if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
      hasClickOrGuide = true;
    }
  });

  tracks.forEach(track => {
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
    audioContext,
    tracks,
    loadAudioFile,
    setPan,
    playAllTracks,
    stopAllTracks,
    goToBeginningAllTracks,
    applyDefaultPanning
}