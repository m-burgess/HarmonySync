import './style.css';
import * as Tauri from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import { Window } from '@tauri-apps/api/window'; // Corrected import
import { loadAudioFile, setPan, playAllTracks, stopAllTracks, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks } from './audio.js';
import { createSlide, createTrackControl, applyDefaultPanning as applyDefaultPanningUI } from './ui.js';
import * as Lyrics from './lyrics.js';

document.addEventListener('DOMContentLoaded', () => {
  const addSetlistButton = document.getElementById('add-audio-button');
  const setlistUl = document.getElementById('setlist');
  const trackControlsContainer = document.getElementById('track-controls');
  const playAllButton = document.getElementById('play-all-button');
  const stopAllButton = document.getElementById('stop-all-button');
  const startFromBeginningButton = document.getElementById('start-from-beginning-button');
  const openAudienceScreenButton = document.getElementById('open-audience-screen-button');
  const openConfidenceScreenButton = document.getElementById('open-confidence-screen-button');
  const slideCol = document.getElementById('slide-col');
  let allSlides = [];

  let currentBackgroundCssContent = ''; // New variable to store background CSS

  if (playAllButton) playAllButton.addEventListener('click', playAllTracks);
  if (stopAllButton) stopAllButton.addEventListener('click', stopAllTracks);
  if (startFromBeginningButton) startFromBeginningButton.addEventListener('click', goToBeginningAllTracks);

  if (openAudienceScreenButton) {
    openAudienceScreenButton.addEventListener('click', async () => {
        let audienceWindow = await Window.getByLabel('audience');
        if (!audienceWindow) {
            audienceWindow = new Window('audience', {
                url: 'audience.html',
                title: 'Audience Screen'
            });
        } else {
            if (await audienceWindow.isVisible()) {
                audienceWindow.hide();
            } else {
                audienceWindow.show();
                // Re-emit background if it exists and window is shown
                if (currentBackgroundCssContent) {
                    emit('set-background', currentBackgroundCssContent);
                }
            }
        }
    });
  }

  if (openConfidenceScreenButton) {
    openConfidenceScreenButton.addEventListener('click', async () => {
        let currentConfidenceWindow = await Window.getByLabel('confidence');
        if (currentConfidenceWindow) {
            // Window already exists, toggle visibility
            if (await currentConfidenceWindow.isVisible()) {
                currentConfidenceWindow.hide();
            } else {
                currentConfidenceWindow.show();
                // Emit a default empty slide to show the clock initially
                emit('display-confidence-slide', { current: null, next: null });
            }
        }
    });
  }

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
            clearTracks();
            if (getAudioContext().state !== 'closed') {
              getAudioContext().close();
            }
            clearAudioBufferCache();
            trackControlsContainer.innerHTML = ''; // Clear existing track controls

            slideCol.innerHTML = ''; // Clear existing slides

            emit('clear-lyric-display');
            emit('clear-confidence-display');

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
            allSlides = [];

            if (lyricsFile) {
              // Process as a song folder (lyrics only)
              console.log('lyricsFile:', lyricsFile);
              const lyricsPath = `${listItem.dataset.path}/${lyricsFile.name}`;
              let lyricsContent = await TauriFs.readFile(lyricsPath, { encoding: 'utf8' });
              if (lyricsContent instanceof Uint8Array) {
                lyricsContent = new TextDecoder().decode(lyricsContent);
              }
              console.log('lyricsContent:', lyricsContent);
              if (typeof lyricsContent === 'string' && lyricsContent.length > 0) {
                const lyricsSlides = Lyrics.parseLyricsToSlides(lyricsContent);
                allSlides = lyricsSlides; // Only lyrics slides
              }
            } else {
              // Process as a sermon/presentation folder (images and/or videos)
              const videoFiles = entries.filter(entry => {
                const isFile = entry.children === undefined;
                const isVideo = isFile && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mov') || entry.name.endsWith('.avi') || entry.name.endsWith('.mkv'));
                return isVideo;
              }).sort((a, b) => a.name.localeCompare(b.name));

              const videoSlides = videoFiles.map(file => ({
                type: 'video',
                path: `${listItem.dataset.path}/${file.name}`,
                name: file.name
              }));

              const imageFiles = entries.filter(entry => {
                const isFile = entry.children === undefined;
                const isImage = isFile && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.gif') || entry.name.endsWith('.webp'));
                return isImage;
              }).sort((a, b) => a.name.localeCompare(b.name));

              const imageSlides = imageFiles.map(file => ({
                type: 'image',
                path: `${listItem.dataset.path}/${file.name}`,
                name: file.name
              }));

              const youtubeFile = entries.find(entry => entry.name === 'youtube.txt' && entry.children === undefined);
              if (youtubeFile) {
                  const youtubePath = `${listItem.dataset.path}/${youtubeFile.name}`;
                  let youtubeContent = await TauriFs.readFile(youtubePath, { encoding: 'utf8' });
                  if (youtubeContent instanceof Uint8Array) {
                      youtubeContent = new TextDecoder().decode(youtubeContent);
                  }
                  if (typeof youtubeContent === 'string' && youtubeContent.length > 0) {
                      const youtubeSlides = youtubeContent.split('\n').map(line => {
                          line = line.trim();
                          if (!line) return null;
                          const parts = line.split(',');
                          let url = parts[0].trim();
                          if (!url.startsWith('http')) {
                              url = 'https://' + url;
                          }
                          const name = parts[1] ? parts[1].trim() : '';
                          const videoId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)[1];
                          return { type: 'youtube', videoId, name };
                      }).filter(Boolean);
                      allSlides = [...videoSlides, ...imageSlides, ...youtubeSlides]; // Combine video, image and youtube slides
                  }
              } else {
                allSlides = [...videoSlides, ...imageSlides]; // Combine video and image slides
              }
            }

            console.log('allSlides:', allSlides);
            allSlides.forEach((slide, index) => {
              const slideDiv = createSlide(slide, index);
              slideCol.appendChild(slideDiv);
            });

            const backgroundCssContent = await invoke('generate_background_css', { path: listItem.dataset.path });
            currentBackgroundCssContent = backgroundCssContent; // Store the content
                                emit('set-background', currentBackgroundCssContent);
            const loadingPromises = audioFiles.map(async (file) => {
              const trackPath = `${listItem.dataset.path}/${file.name}`;
              const fileName = file.name;
              try {
                const audioBuffer = await loadAudioFile(trackPath);
                if (audioBuffer) {
                  const track = {
                    buffer: audioBuffer,
                    source: null,
                    gainNode: getAudioContext().createGain(),
                    pannerNode: getAudioContext().createStereoPanner(),
                    isPlaying: false,
                    isMuted: false,
                    startTime: 0,
                    offset: 0,
                    path: trackPath,
                    name: fileName,
                    panValue: 0, // Initialize pan value
                  };
                  getTracks().push(track);
                  return createTrackControl(track);
                }
              } catch (audioError) {
                console.error(`Error loading audio file ${fileName}:`, audioError);
              }
              return null;
            });

            const trackControls = await Promise.all(loadingPromises);
            const fragment = document.createDocumentFragment();
            trackControls.filter(Boolean).forEach(control => {
              fragment.appendChild(control);
            });
            trackControlsContainer.appendChild(fragment);

            const currentLoadingMessage = document.getElementById('loading-message');
            if (currentLoadingMessage) {
              currentLoadingMessage.remove();
            }

            applyDefaultPanning();
          } catch (error) {
            console.error('Error reading directory:', error);
            TauriDialog.message(`Failed to load setlist from ${listItem.dataset.path}. It might have been moved or deleted. Please select a valid folder.`, { title: 'Error Loading Setlist', type: 'error' });
          }
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  });

  slideCol.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  slideCol.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const draggedElement = document.querySelector(`[data-slide-index='${draggedIndex}']`);
    const dropTarget = e.target.closest('.slide');

    if (dropTarget && draggedElement) {
        const dropTargetIndex = parseInt(dropTarget.dataset.slideIndex);

        const draggedSlide = allSlides[draggedIndex];
        allSlides.splice(draggedIndex, 1);
        allSlides.splice(dropTargetIndex, 0, draggedSlide);

        // Re-render all slides
        slideCol.innerHTML = '';
        allSlides.forEach((slide, index) => {
            const slideDiv = createSlide(slide, index);
            slideCol.appendChild(slideDiv);
        });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const selectedSlide = document.querySelector('.slide.selected');
        if (!selectedSlide) return;

        let nextSlide = null;

        if (e.key === 'ArrowDown') {
            nextSlide = selectedSlide.nextElementSibling;
        } else if (e.key === 'ArrowUp') {
            nextSlide = selectedSlide.previousElementSibling;
        }

        if (nextSlide && nextSlide.classList.contains('slide')) {
            nextSlide.click();
            nextSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
  });
});