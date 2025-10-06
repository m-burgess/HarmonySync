import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { loadAudioFile, setPan, playAllTracks, stopAllAudio, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks, cleanupAudio } from './audio.js';

import { parseLyricsToSlides } from './lyrics.js';

const SetlistManager = ({ setAllSlides, setAllTracks }) => {
  const [setlist, setSetlist] = useState([]);
  const [currentBackgroundCssContent, setCurrentBackgroundCssContent] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleAddFolder = async () => {
    try {
      const selectedPaths = await TauriDialog.open({
        directory: true,
        multiple: true,
        title: 'Select folders for the presentation',
      });

      if (selectedPaths) {
        // selectedPaths will be an array if multiple is true
        for (const path of selectedPaths) {
          const folderName = await TauriPath.basename(path);
          const newSetlistItem = { path: path, name: folderName };
          setSetlist((prevSetlist) => [...prevSetlist, newSetlistItem]);
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleSetlistItemClick = async (itemPath) => {
    console.log('Folder clicked:', itemPath);
    setLoadingProgress(0);
    setLoadingMessage('Loading folder contents...');
    try {
      // Clear previous tracks and reset audio context if a new folder is loaded
      cleanupAudio();
      clearTracks();

      TauriEvent.emit('clear-lyric-display');
      TauriEvent.emit('clear-confidence-display');

      const entries = await TauriFs.readDir(itemPath, { recursive: false });
      const audioFiles = entries.filter(entry => {
        const isFile = entry.children === undefined; // Check if it's a file
        const isAudio = isFile && (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.ogg'));
        return isAudio;
      }).sort((a, b) => a.name.localeCompare(b.name));

      const lyricsFile = entries.find(entry => entry.name === 'lyrics.txt' && entry.children === undefined);
      let loadedSlides = [];
      let totalFilesToLoad = audioFiles.length;
      let loadedCount = 0;

      if (lyricsFile) {
        setLoadingMessage('Loading lyrics...');
        console.log('lyricsFile:', lyricsFile);
        const lyricsPath = `${itemPath}/${lyricsFile.name}`;
        let lyricsContent = await TauriFs.readFile(lyricsPath, { encoding: 'utf8' });
        if (lyricsContent instanceof Uint8Array) {
          lyricsContent = new TextDecoder().decode(lyricsContent);
        }
        console.log('lyricsContent:', lyricsContent);
        if (typeof lyricsContent === 'string' && lyricsContent.length > 0) {
          const lyricsSlides = parseLyricsToSlides(lyricsContent);
          loadedSlides = lyricsSlides;
        }
      } else {
        const videoFiles = entries.filter(entry => {
          const isFile = entry.children === undefined;
          const isVideo = isFile && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mov') || entry.name.endsWith('.avi') || entry.name.endsWith('.mkv'));
          return isVideo;
        }).sort((a, b) => a.name.localeCompare(b.name));

        const videoSlides = videoFiles.map(file => ({
          type: 'video',
          path: `${itemPath}/${file.name}`,
          name: file.name
        }));

        const imageFiles = entries.filter(entry => {
          const isFile = entry.children === undefined;
          const isImage = isFile && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.gif') || entry.name.endsWith('.webp'));
          return isImage;
        }).sort((a, b) => a.name.localeCompare(b.name));

        const imageSlides = imageFiles.map(file => ({
          type: 'image',
          path: `${itemPath}/${file.name}`,
          name: file.name
        }));

        const youtubeFile = entries.find(entry => entry.name === 'youtube.txt' && entry.children === undefined);
        if (youtubeFile) {
            setLoadingMessage('Loading YouTube links...');
            const youtubePath = `${itemPath}/${youtubeFile.name}`;
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
                loadedSlides = [...videoSlides, ...imageSlides, ...youtubeSlides];
            }
        } else {
          loadedSlides = [...videoFiles, ...imageSlides];
        }
      }

      console.log('loadedSlides:', loadedSlides);
      setAllSlides(loadedSlides); // Update the allSlides state in App.jsx

      setLoadingMessage('Generating background CSS...');
      const backgroundCssContent = await TauriCore.invoke('generate_background_css', { path: itemPath });
      setCurrentBackgroundCssContent(backgroundCssContent); // Store the content
      TauriEvent.emit('set-background', backgroundCssContent);

      const loadedTracks = [];
      setLoadingMessage('Loading audio tracks...');
      const loadingPromises = audioFiles.map(async (file) => {
        const trackPath = `${itemPath}/${file.name}`;
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
              panValue: 0,
              individualVolume: 0.7, // Initialize individual volume
            };
            getTracks().push(track);
            loadedTracks.push(track);
          }
        } catch (audioError) {
          console.error(`Error loading audio file ${fileName}:`, audioError);
        } finally {
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / totalFilesToLoad) * 100));
        }
        return null;
      });

      await Promise.all(loadingPromises);
      applyDefaultPanning(loadedTracks);
      setAllTracks([...loadedTracks]); // Update the allTracks state in App.jsx with a new array
      setLoadingMessage('Loading complete!');
      setLoadingProgress(100);

    } catch (error) {
      console.error('Error reading directory:', error);
      TauriDialog.message(`Failed to load setlist from ${itemPath}. It might have been moved or deleted. Please select a valid folder.`, { title: 'Error Loading Setlist', type: 'error' });
      setLoadingMessage('Error loading folder.');
      setLoadingProgress(0);
    }
  };

  return (
    <div className="col" id="setlist-col">
      <button onClick={handleAddFolder} id="add-folder-button">Add Folder to Presentation</button>
      {loadingProgress > 0 && loadingProgress < 100 && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
          <div className="progress-text">{loadingMessage} ({loadingProgress}%)</div>
        </div>
      )}
      {loadingProgress === 100 && (
        <div className="progress-container">
          <div className="progress-text">{loadingMessage}</div>
        </div>
      )}
      <ul id="setlist">
        {setlist.map((item, index) => (
          <li key={index} className="setlist-item" onClick={() => handleSetlistItemClick(item.path)}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetlistManager;