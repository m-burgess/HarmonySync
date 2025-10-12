import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { loadAudioFile, loadMoggChannel, setPan, playAllTracks, stopAllAudio, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks, cleanupAudio, addTracks } from './audio.js';
import LoadingModal from './LoadingModal.jsx';
import { parseLyricsToSlides } from './lyrics.js';
import { getVideoMetadata } from './video.js';

const SetlistManager = ({ setAllSlides, setAllTracks, serviceOrder, setServiceOrder }) => {
  const [currentBackgroundCssContent, setCurrentBackgroundCssContent] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadFolderContents = async (itemPath) => {
    if (!itemPath || typeof itemPath !== 'string') {
      console.error('Invalid itemPath provided to loadFolderContents:', itemPath);
      return { loadedSlides: [], loadedTracks: [], unlistenOgg: () => {}, unlistenVideoTranscode: () => {} };
    }
    const unlistenOgg = await TauriEvent.listen('ogg-conversion-progress', (event) => {
      const payload = event.payload;
      setLoadingProgress(payload.progress);
      setLoadingMessage(payload.message);
    });

    const unlistenVideoTranscode = await TauriEvent.listen('video-transcode-progress', (event) => {
      const payload = event.payload;
      setLoadingProgress(payload.progress);
      setLoadingMessage(payload.message);
    });

    try {
      const entries = await TauriFs.readDir(itemPath, { recursive: false });
      const audioFiles = entries.filter(entry => {
        const isFile = entry.children === undefined; // Check if it's a file
        const isAudio = isFile && (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.ogg'));
        return isAudio;
      }).sort((a, b) => a.name.localeCompare(b.name));

      const processedAudioFiles = await Promise.all(audioFiles.map(async (file) => {
        const originalPath = `${itemPath}/${file.name}`;
        const fileNameWithOgg = file.name.endsWith('.ogg') ? file.name : `${file.name}.ogg`;
        const targetCachePathAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache', fileNameWithOgg);

        if (!file.name.endsWith('.ogg')) {
          setLoadingMessage(`Converting ${file.name} to Ogg...`);
          try {
            const tempOggPath = await TauriCore.invoke('convert_to_ogg', { inputPath: originalPath });
            const cacheDirAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache');
            await TauriFs.mkdir(cacheDirAbsolute, { recursive: true });
            await TauriFs.copyFile(tempOggPath, targetCachePathAbsolute);
            await TauriFs.remove(tempOggPath);
            return { ...file, path: targetCachePathAbsolute, name: fileNameWithOgg };
          } catch (error) {
            console.error(`Error converting ${file.name} to Ogg:`, error);
            return null;
          }
        } else {
          const sourcePath = originalPath;
          const cacheDirAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache');
          await TauriFs.mkdir(cacheDirAbsolute, { recursive: true });
          await TauriFs.copyFile(sourcePath, targetCachePathAbsolute);
          return { ...file, path: targetCachePathAbsolute, name: fileNameWithOgg };
        }
      }));
      const validAudioFiles = processedAudioFiles.filter(Boolean);

      let loadedSlides = [];
      const lyricsFile = entries.find(entry => entry.name === 'lyrics.txt' && entry.children === undefined);
      if (lyricsFile) {
        setLoadingMessage('Loading lyrics...');
        const lyricsPath = `${itemPath}/${lyricsFile.name}`;
        let content = await TauriFs.readFile(lyricsPath, { encoding: 'utf8' });
        if (content instanceof Uint8Array) {
          content = new TextDecoder().decode(content);
        }
        if (typeof content === 'string' && content.length > 0) {
          loadedSlides = parseLyricsToSlides(content);
        }
      } else {
        const videoFiles = entries.filter(entry => {
          const isFile = entry.children === undefined;
          const isVideo = isFile && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mov') || entry.name.endsWith('.avi') || entry.name.endsWith('.mkv'));
          return isVideo;
        }).sort((a, b) => a.name.localeCompare(b.name));

        setLoadingMessage('Loading video metadata...');
        const videoSlidesPromises = videoFiles.map(async (file) => {
          const fullPath = `${itemPath}/${file.name}`;
          const metadata = await getVideoMetadata(fullPath);
          if (metadata) {
            // Construct the expected transcoded path
            const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
            const transcodedFileName = `${fileNameWithoutExt}_youtube.mp4`;
            const cacheDirAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache');
            const expectedTranscodedPath = await TauriPath.join(cacheDirAbsolute, transcodedFileName);

            let videoPathToUse = fullPath;

            // Check if the transcoded file already exists
            const transcodedExists = await TauriFs.exists(expectedTranscodedPath);

            if (transcodedExists) {
              console.log(`Found existing transcoded video: ${expectedTranscodedPath}`);
              videoPathToUse = expectedTranscodedPath;
            } else {
              console.log(`Transcoded video not found for ${file.name}. Will transcode on first play.`);
            }

            return {
              type: 'video',
              path: videoPathToUse, // Use transcoded path if exists, else original
              name: file.name,
              duration: metadata.duration,
              thumbnail_path: metadata.thumbnail_path,
            };
          }
          return null; // Skip if metadata fetching fails
        });
        const videoSlides = (await Promise.all(videoSlidesPromises)).filter(Boolean);

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
          loadedSlides = [...videoSlides, ...imageFiles.map(file => ({ type: 'image', path: `${itemPath}/${file.name}`, name: file.name }))];
        }
      }

      // Load audio tracks
      setLoadingMessage('Loading audio tracks...');
      const loadedTracks = [];
      const loadingPromises = validAudioFiles.map(async (file) => {
        try {
          const audioBuffer = await loadAudioFile(file.path);
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
              path: file.path,
              name: file.name,
              panValue: 0,
              individualVolume: 0.7,
            };
            getTracks().push(track);
            loadedTracks.push(track);
          }
        } catch (audioError) {
          console.error(`Error loading audio file ${file.name}:`, audioError);
        }
        return null;
      });

      await Promise.all(loadingPromises);
      addTracks(loadedTracks);
      applyDefaultPanning(loadedTracks);

      return { loadedSlides, loadedTracks, unlistenOgg, unlistenVideoTranscode };

    } finally {
      // Listeners are now unlistened in the calling function
    }
  };

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
          // Update serviceOrder prop
          setServiceOrder((prevOrder) => [...prevOrder, { type: 'folder', path: path, name: folderName }]);
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleSetBackgroundClick = async (itemPath) => {
    try {
      const backgroundCssPath = await TauriPath.join(itemPath, 'background.css');
      const exists = await TauriFs.exists(backgroundCssPath);
      if (exists) {
        const backgroundCssContent = await TauriCore.invoke('generate_background_css', { path: itemPath });
        TauriEvent.emit('set-background', backgroundCssContent);
      } else {
        console.log('No background.css file found in this folder.');
      }
    } catch (error) {
      console.error('Error setting background:', error);
    }
  };

  const handleRemoveItem = (indexToRemove) => {
    setServiceOrder((prevOrder) => prevOrder.filter((_, index) => index !== indexToRemove));
  };

  const handleSetlistItemClick = async (clickedItem, index) => {
    console.log('Item clicked:', clickedItem);
    setLoadingProgress(0);
    setLoadingMessage('Loading item contents...');

    let unlistenOgg = () => {}; // Initialize with a no-op function
    let unlistenVideoTranscode = () => {}; // Initialize with a no-op function

    try {
      // Clear previous tracks and reset audio context if a new folder is loaded
      cleanupAudio();
      clearTracks();

      TauriEvent.emit('clear-lyric-display');
      TauriEvent.emit('clear-confidence-display');

      let currentSlides = [];
      let currentTracks = [];

      if (clickedItem.loaded) {
        // If already loaded, use the stored slides and tracks
        currentSlides = clickedItem.slides;
        currentTracks = clickedItem.tracks;
        setLoadingMessage('Item already loaded.');
        setLoadingProgress(100);
      } else {
        // Item not loaded, fetch details and process
        let details;
        if (clickedItem.type === 'song') {
          details = await TauriCore.invoke('get_song_details', { songId: clickedItem.id });
          // 1. Create slides from lyrics
          currentSlides = parseLyricsToSlides(details.lyrics);

          // 2. Create and load audio tracks
          const newLoadedTracks = [];
          const loadingPromises = details.tracks.map(async (trackInfo) => {
            try {
              let audioBuffer;
              let trackName = trackInfo.track_name || 'Unknown Track';
              
              // Check if this is a MOGG file (track_name contains channel index)
              if (trackName.includes(':')) {
                const parts = trackName.split(':');
                const actualTrackName = parts[0];
                const channelIndex = parseInt(parts[1], 10);
                
                // Validate channel index
                if (isNaN(channelIndex)) {
                  console.error(`Invalid channel index in track name: ${trackName}`);
                  return null;
                }
                
                // Load the specific channel from the MOGG file
                audioBuffer = await loadMoggChannel(trackInfo.file_path, channelIndex);
                trackName = actualTrackName; // Use the actual track name without channel index
                
                if (!audioBuffer) {
                  console.error(`Failed to load MOGG channel ${channelIndex} for track: ${actualTrackName}`);
                  return null;
                }
              } else {
                // Legacy: Load as a regular single audio file
                audioBuffer = await loadAudioFile(trackInfo.file_path);
                
                if (!audioBuffer) {
                  console.error(`Failed to load audio file for track: ${trackName}`);
                  return null;
                }
              }
              
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
                  path: trackInfo.file_path,
                  name: trackName,
                  panValue: 0,
                  individualVolume: 0.7,
                };
                getTracks().push(track); // Add to global tracks array in audio.js
                newLoadedTracks.push(track);
              }
            } catch (audioError) {
              console.error(`Error loading audio file ${trackInfo.track_name}:`, audioError);
            }
          });

          await Promise.all(loadingPromises);
          applyDefaultPanning(newLoadedTracks);
          addTracks(newLoadedTracks);
          currentTracks = newLoadedTracks;

        } else if (clickedItem.type === 'presentation') {
          details = await TauriCore.invoke('get_presentation_details', { presentationId: clickedItem.id });
          const { loadedSlides, loadedTracks, unlistenOgg: newUnlistenOgg, unlistenVideoTranscode: newUnlistenVideoTranscode } = await loadFolderContents(details.path);
          unlistenOgg = newUnlistenOgg;
          unlistenVideoTranscode = newUnlistenVideoTranscode;
          currentSlides = loadedSlides;
          currentTracks = loadedTracks;
        }

        // Update the serviceOrder to mark this item as loaded
        setServiceOrder(prevOrder =>
          prevOrder.map((item, idx) =>
            idx === index
              ? { ...item, loaded: true, slides: currentSlides, tracks: currentTracks }
              : item
          )
        );
        setLoadingMessage('Loading complete!');
        setLoadingProgress(100);
      }

      setAllSlides(currentSlides);
      setAllTracks(currentTracks);

      // Automatically 'click' the first slide to display it
      if (currentSlides.length > 0) {
        const firstSlide = currentSlides[0];
        if (firstSlide.type === 'image') {
          TauriEvent.emit('display-image-slide', { path: firstSlide.path, name: firstSlide.name });
        } else if (firstSlide.type === 'video') {
          TauriCore.invoke('display_video_slide', { path: firstSlide.path, duration: firstSlide.duration })
            .catch(e => console.error('Error displaying video slide:', e));
        } else if (firstSlide.type === 'youtube') {
          TauriEvent.emit('navigate', { videoId: firstSlide.videoId });
        } else { // Lyrics slide
          TauriEvent.emit('display-lyric-slide', { text: firstSlide.text, section: firstSlide.section });
          const line1 = firstSlide.text && firstSlide.text.length > 0 ? firstSlide.text[0] : '';
          const line2 = firstSlide.text && firstSlide.text.length > 1 ? firstSlide.text[1] : '';
          TauriEvent.emit('set-lower-thirds-text', { line1, line2 });
        }
      }

    } catch (error) {
      console.error('Error loading setlist item:', error);
      TauriDialog.message(`Failed to load item. It might have been moved or deleted.`, { title: 'Error Loading Item', type: 'error' });
      setLoadingMessage('Error loading item.');
      setLoadingProgress(0);
    } finally {
      unlistenOgg(); // Clean up the event listener
      unlistenVideoTranscode();
    }
  };

  return (
    <div className="col" id="setlist-col">
      <h2>Service Order</h2>
      <LoadingModal progress={loadingProgress} message={loadingMessage} />
      <ul id="setlist">
        {serviceOrder.map((item, index) => (
          <li key={index} className="setlist-item" >
            <span onClick={() => handleSetlistItemClick(item, index)}>{item.name}</span>
            <button onClick={() => handleRemoveItem(index)}>-</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetlistManager;