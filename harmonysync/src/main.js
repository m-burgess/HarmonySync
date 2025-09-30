import './style.css';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';

let audioContext;
let tracks = []; // Stores { buffer, source, gainNode, pannerNode, isPlaying, startTime, offset, path, name, panValue }
let isPlayingAll = false;
let currentPlaybackTime = 0;
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
  currentPlaybackTime = 0;
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

    // Update UI for pan buttons
    const trackDiv = document.querySelector(`div.track[data-path="${track.path}"]`);
    if (trackDiv) {
      trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
      if (panValue === -1) {
        trackDiv.querySelector('.pan-left').classList.add('active-pan');
      } else if (panValue === 0) {
        trackDiv.querySelector('.pan-center').classList.add('active-pan');
      } else if (panValue === 1) {
        trackDiv.querySelector('.pan-right').classList.add('active-pan');
      }
    }
  });
}

function parseLyricsToSlides(lyricsText) {
  const slides = [];
  let currentSection = 'Intro';
  let currentSlideLines = [];

  const lines = lyricsText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    const sectionMatch = line.match(/^\ súčasťou(.*)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    currentSlideLines.push(line);

    if (currentSlideLines.length === 2) {
      slides.push({ text: currentSlideLines, section: currentSection });
      currentSlideLines = [];
    }
  }

  // Handle any remaining lines for the last slide
  if (currentSlideLines.length > 0) {
    slides.push({ text: currentSlideLines, section: currentSection });
  }

  return slides;
}

document.addEventListener('DOMContentLoaded', () => {
  const addSetlistButton = document.getElementById('add-audio-button'); // Changed ID to match index.html
  const setlistUl = document.getElementById('setlist');
  const trackControlsContainer = document.getElementById('track-controls');
  const playAllButton = document.getElementById('play-all-button');
  const stopAllButton = document.getElementById('stop-all-button');
  const startFromBeginningButton = document.getElementById('start-from-beginning-button');

  if (playAllButton) playAllButton.addEventListener('click', playAllTracks);
  if (stopAllButton) stopAllButton.addEventListener('click', stopAllTracks);
  if (startFromBeginningButton) startFromBeginningButton.addEventListener('click', goToBeginningAllTracks);

  addSetlistButton.addEventListener('click', async () => {
    try {
      const selectedPath = await TauriDialog.open({
        directory: true,
        multiple: false,
        title: 'Select a folder for the setlist',
      });

      if (selectedPath) {
        const folderName = await TauriPath.basename(selectedPath);
        const listItem = document.createElement('li');
        listItem.textContent = folderName;
        listItem.dataset.path = selectedPath; // Store the full path
        listItem.classList.add('setlist-item'); // Add a class for styling/selection
        setlistUl.appendChild(listItem);

        listItem.addEventListener('click', async () => {
          console.log('Folder clicked:', listItem.dataset.path);
          try {
            // Clear previous tracks and reset audio context if a new folder is loaded
            stopAllTracks(); // Stop any currently playing tracks
            tracks = [];
            if (audioContext) {
              audioContext.close();
              audioContext = null;
            }
            trackControlsContainer.innerHTML = ''; // Clear existing track controls

            const slideCol = document.getElementById('slide-col');
            slideCol.innerHTML = ''; // Clear existing slides

            const loadingMessage = document.createElement('p');
            loadingMessage.textContent = 'Loading tracks...';
            loadingMessage.id = 'loading-message';
            trackControlsContainer.appendChild(loadingMessage);

            const entries = await TauriFs.readDir(listItem.dataset.path, { recursive: false });
            const audioFiles = entries.filter(entry => {
              const isFile = entry.children === undefined; // Check if it's a file
              const isAudio = isFile && (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.ogg'));
              return isAudio;
            }).sort((a, b) => a.name.localeCompare(b.name));

            const lyricsFile = entries.find(entry => entry.name === 'lyrics.txt' && entry.children === undefined);
            if (lyricsFile) {
              const lyricsPath = `${listItem.dataset.path}/${lyricsFile.name}`;
              const lyricsContent = await TauriFs.readFile(lyricsPath, { encoding: 'utf8' });
              if (typeof lyricsContent === 'string' && lyricsContent.length > 0) {
                const slides = parseLyricsToSlides(lyricsContent);

                slides.forEach((slide, index) => {
                const slideDiv = document.createElement('div');
                slideDiv.classList.add('slide');
                slideDiv.dataset.slideIndex = index;

                const sectionLabel = document.createElement('span');
                sectionLabel.classList.add('slide-section-label');
                sectionLabel.textContent = `[${slide.section}]`;
                slideDiv.appendChild(sectionLabel);

                slide.text.forEach(line => {
                  const p = document.createElement('p');
                  p.textContent = line;
                  slideDiv.appendChild(p);
                });
                slideCol.appendChild(slideDiv);
              });
            }
            }

            const fragment = document.createDocumentFragment();
            const loadingPromises = [];

            for (const file of audioFiles) {
              const trackPath = `${listItem.dataset.path}/${file.name}`;
              const fileName = file.name;

              const trackDiv = document.createElement('div');
              trackDiv.classList.add('track');
              trackDiv.dataset.path = trackPath;

              const trackNameSpan = document.createElement('span');
              trackNameSpan.textContent = `Loading: ${fileName}`;
              trackDiv.appendChild(trackNameSpan);

              const volumeSlider = document.createElement('input');
              volumeSlider.type = 'range';
              volumeSlider.min = '0';
              volumeSlider.max = '1';
              volumeSlider.step = '0.01';
              volumeSlider.value = '0.7';
              volumeSlider.classList.add('volume-slider');
              volumeSlider.disabled = true; // Disable until loaded
              trackDiv.appendChild(volumeSlider);

              const panControlsDiv = document.createElement('div');
              panControlsDiv.classList.add('pan-controls');

              const panLeftButton = document.createElement('button');
              panLeftButton.textContent = 'L';
              panLeftButton.classList.add('pan-button', 'pan-left');
              panLeftButton.disabled = true; // Disable until loaded
              panControlsDiv.appendChild(panLeftButton);

              const panCenterButton = document.createElement('button');
              panCenterButton.textContent = 'C';
              panCenterButton.classList.add('pan-button', 'pan-center');
              panCenterButton.disabled = true; // Disable until loaded
              panControlsDiv.appendChild(panCenterButton);

              const panRightButton = document.createElement('button');
              panRightButton.textContent = 'R';
              panRightButton.classList.add('pan-button', 'pan-right');
              panRightButton.disabled = true; // Disable until loaded
              panControlsDiv.appendChild(panRightButton);

              trackDiv.appendChild(panControlsDiv);

              const muteButton = document.createElement('button');
              muteButton.textContent = 'Mute';
              muteButton.classList.add('mute-button');
              muteButton.disabled = true; // Disable until loaded
              trackDiv.appendChild(muteButton);

              fragment.appendChild(trackDiv);

              // Start loading audio asynchronously
              const loadingPromise = loadAudioFile(trackPath).then(audioBuffer => {
                if (audioBuffer) {
                  const track = {
                    buffer: audioBuffer,
                    source: null,
                    gainNode: audioContext.createGain(),
                    pannerNode: audioContext.createStereoPanner(),
                    isPlaying: false,
                    isMuted: false,
                    startTime: 0,
                    offset: 0,
                    path: trackPath,
                    name: fileName,
                    panValue: 0, // Initialize pan value
                  };
                  tracks.push(track);

                  // Update UI for this specific track
                  trackNameSpan.textContent = fileName;
                  volumeSlider.disabled = false;
                  panLeftButton.disabled = false;
                  panCenterButton.disabled = false;
                  panRightButton.disabled = false;
                  muteButton.disabled = false;

                  // Attach event listeners now that track object is complete
                  volumeSlider.addEventListener('input', () => {
                    track.gainNode.gain.value = track.isMuted ? 0 : parseFloat(volumeSlider.value);
                  });
                  panLeftButton.addEventListener('click', () => {
                    setPan(track, -1);
                    trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
                    panLeftButton.classList.add('active-pan');
                  });
                  panCenterButton.addEventListener('click', () => {
                    setPan(track, 0);
                    trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
                    panCenterButton.classList.add('active-pan');
                  });
                  panRightButton.addEventListener('click', () => {
                    setPan(track, 1);
                    trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
                    panRightButton.classList.add('active-pan');
                  });
                  muteButton.addEventListener('click', () => {
                    track.isMuted = !track.isMuted;
                    if (track.isMuted) {
                      muteButton.classList.add('active');
                      track.gainNode.gain.value = 0;
                    } else {
                      muteButton.classList.remove('active');
                      track.gainNode.gain.value = parseFloat(volumeSlider.value); // Restore volume
                    }
                  });
                }
              }).catch(error => {
                console.error(`Error loading audio for ${fileName}:`, error);
                trackNameSpan.textContent = `Error loading: ${fileName}`;
              });
              loadingPromises.push(loadingPromise);
            }

            trackControlsContainer.appendChild(fragment); // Append all placeholders at once

            await Promise.all(loadingPromises); // Wait for all audio to be decoded

            // Remove loading message
            const currentLoadingMessage = document.getElementById('loading-message');
            if (currentLoadingMessage) {
              currentLoadingMessage.remove();
            }

            applyDefaultPanning(); // Apply default panning after all files are loaded and UI is updated
          } catch (error) {
            console.error('Error reading directory:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  });
});
