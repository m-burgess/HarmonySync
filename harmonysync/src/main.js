import './style.css';
import * as Tauri from '@tauri-apps/api';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import { loadAudioFile, playAllTracks, stopAllTracks, goToBeginningAllTracks, tracks, audioContext } from './audio.js';
import { createSlide, createTrackControl, applyDefaultPanning } from './ui.js';
import { parseLyricsToSlides } from './lyrics.js';

document.addEventListener('DOMContentLoaded', () => {
  const addSetlistButton = document.getElementById('add-audio-button');
  const setlistUl = document.getElementById('setlist');
  const trackControlsContainer = document.getElementById('track-controls');
  const playAllButton = document.getElementById('play-all-button');
  const stopAllButton = document.getElementById('stop-all-button');
  const startFromBeginningButton = document.getElementById('start-from-beginning-button');
  const openAudienceScreenButton = document.getElementById('open-audience-screen-button');

  if (playAllButton) playAllButton.addEventListener('click', playAllTracks);
  if (stopAllButton) stopAllButton.addEventListener('click', stopAllTracks);
  if (startFromBeginningButton) startFromBeginningButton.addEventListener('click', goToBeginningAllTracks);
  if (openAudienceScreenButton) {
    openAudienceScreenButton.addEventListener('click', () => {
        const audienceWindow = new Tauri.window.WebviewWindow('audience', {
            url: 'audience.html',
            title: 'Audience Screen'
        });
        audienceWindow.once('tauri://created', function () {
            // window successfully created
        });
        audienceWindow.once('tauri://error', function (e) {
            // an error occurred during webview window creation
        });
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
            tracks.length = 0;
            if (audioContext) {
              audioContext.close();
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
            console.log('lyricsFile:', lyricsFile);
            if (lyricsFile) {
              const lyricsPath = `${listItem.dataset.path}/${lyricsFile.name}`;
              let lyricsContent = await TauriFs.readFile(lyricsPath, { encoding: 'utf8' });
              if (lyricsContent instanceof Uint8Array) {
                lyricsContent = new TextDecoder().decode(lyricsContent);
              }
              console.log('lyricsContent:', lyricsContent);
              if (typeof lyricsContent === 'string' && lyricsContent.length > 0) {
                const slides = parseLyricsToSlides(lyricsContent);
                console.log('slides:', slides);
                slides.forEach((slide, index) => {
                  const slideDiv = createSlide(slide, index);
                  slideCol.appendChild(slideDiv);
                });
              }
            }

            const backgroundCssFile = entries.find(entry => entry.name === 'background.css' && entry.children === undefined);
            if (backgroundCssFile) {
                const backgroundCssPath = `${listItem.dataset.path}/${backgroundCssFile.name}`;
                let backgroundCssContent = await TauriFs.readFile(backgroundCssPath, { encoding: 'utf8' });
                if (backgroundCssContent instanceof Uint8Array) {
                    backgroundCssContent = new TextDecoder().decode(backgroundCssContent);
                }
                Tauri.event.emit('set-background', backgroundCssContent);
            }

            const loadingPromises = audioFiles.map(async (file) => {
              const trackPath = `${listItem.dataset.path}/${file.name}`;
              const fileName = file.name;
              const audioBuffer = await loadAudioFile(trackPath);
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
                const trackControl = createTrackControl(track);
                trackControlsContainer.appendChild(trackControl);
              }
            });

            await Promise.all(loadingPromises);

            const currentLoadingMessage = document.getElementById('loading-message');
            if (currentLoadingMessage) {
              currentLoadingMessage.remove();
            }

            applyDefaultPanning(tracks);
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