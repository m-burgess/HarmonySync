import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { loadAudioFile, loadMoggChannel, setPan, playAllTracks, stopAllAudio, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks, cleanupAudio, addTracks } from './audio.js';
import { loadSongTracksForStreaming } from './streaming-audio.js';
import { songTransitionManager } from './song-transition.js';
import LoadingModal from './LoadingModal.jsx';
import { parseLyricsToSlides } from './lyrics.js';
import { getVideoMetadata } from './video.js';
import './transitions.css';

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

      // Load audio tracks using streaming approach
      setLoadingMessage('Loading audio tracks...');
      const loadedTracks = [];
      
      // Convert folder audio files to track format expected by streaming function
      const folderTracks = validAudioFiles.map(file => ({
        file_path: file.path,
        track_name: file.name
      }));
      
      if (folderTracks.length > 0) {
        const streamingTracks = await loadSongTracksForStreaming(folderTracks);
        
        // Convert streaming tracks to the format expected by the rest of the app
        for (const streamingTrack of streamingTracks) {
          const track = {
            buffer: streamingTrack.buffer,
            source: null,
            gainNode: getAudioContext().createGain(),
            pannerNode: getAudioContext().createStereoPanner(),
            isPlaying: false,
            isMuted: false,
            startTime: 0,
            offset: 0,
            path: streamingTrack.filePath,
            name: streamingTrack.name,
            panValue: 0,
            individualVolume: 0.7,
          };
          getTracks().push(track);
          loadedTracks.push(track);
        }
        
        addTracks(loadedTracks);
        applyDefaultPanning(loadedTracks);
      }

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

  const handleSetlistItemClick = async (clickedItem, index, transitionType = 'crossfade') => {
    console.log('Item clicked:', clickedItem, 'Transition type:', transitionType);
    setLoadingProgress(0);
    setLoadingMessage('Loading item contents...');

    let unlistenOgg = () => {}; // Initialize with a no-op function
    let unlistenVideoTranscode = () => {}; // Initialize with a no-op function

    try {
      // Check if we should use smooth transition for songs
      const shouldUseTransition = clickedItem.type === 'song' && 
                                  getTracks().length > 0 && 
                                  transitionType !== 'none';

      if (shouldUseTransition) {
        // Use smooth transition system
        setLoadingMessage('Preparing smooth transition...');
        
        // Get song details for transition
        const details = await TauriCore.invoke('get_song_details', { songId: clickedItem.id });
        const songDetails = {
          id: clickedItem.id,
          title: clickedItem.name,
          tracks: details.tracks
        };

        // Preload next song if not already preloaded
        if (!songTransitionManager.preloadedSongs.has(clickedItem.id)) {
          setLoadingMessage('Preloading tracks for smooth transition...');
          await songTransitionManager.preloadNextSong(songDetails);
        }

        // Perform smooth transition
        setLoadingMessage(`Performing ${transitionType} transition...`);
        const transitionSuccess = await songTransitionManager.transitionToSong(songDetails, transitionType);
        
        if (transitionSuccess) {
          // Update slides
          const currentSlides = parseLyricsToSlides(details.lyrics);
          setAllSlides(currentSlides);
          setAllTracks(getTracks());
          
          // Mark item as loaded
          setServiceOrder(prevOrder =>
            prevOrder.map((item, idx) =>
              idx === index
                ? { ...item, loaded: true, slides: currentSlides, tracks: getTracks() }
                : item
            )
          );
          
          // Auto-preload next song for seamless transitions
          const nextSongIndex = serviceOrder.findIndex((item, idx) => 
            idx > index && item.type === 'song' && !item.loaded
          );
          
          if (nextSongIndex !== -1) {
            const nextSong = serviceOrder[nextSongIndex];
            console.log('Auto-preloading next song:', nextSong.name);
            try {
              const nextDetails = await TauriCore.invoke('get_song_details', { songId: nextSong.id });
              const nextSongDetails = {
                id: nextSong.id,
                title: nextSong.name,
                tracks: nextDetails.tracks
              };
              await songTransitionManager.preloadNextSong(nextSongDetails);
              console.log('Next song preloaded successfully');
            } catch (error) {
              console.error('Error auto-preloading next song:', error);
            }
          }
          
          setLoadingMessage('Smooth transition completed');
          setLoadingProgress(100);
          return;
        } else {
          console.warn('Smooth transition failed, falling back to standard loading');
        }
      }

      // Standard loading (no transition or fallback)
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

          // 2. Load audio tracks using new streaming approach
          console.log('Loading tracks for streaming:', details.tracks);
          const streamingTracks = await loadSongTracksForStreaming(details.tracks);
          
          // Convert streaming tracks to the format expected by the rest of the app
          const newLoadedTracks = streamingTracks.map(streamingTrack => {
            const track = {
              buffer: streamingTrack.buffer,
              source: null,
              gainNode: getAudioContext().createGain(),
              pannerNode: getAudioContext().createStereoPanner(),
              isPlaying: false,
              isMuted: false,
              startTime: 0,
              offset: 0,
              path: streamingTrack.filePath,
              name: streamingTrack.name,
              panValue: 0,
              individualVolume: 0.7,
            };
            getTracks().push(track); // Add to global tracks array in audio.js
            return track;
          });

          console.log(`Successfully loaded ${newLoadedTracks.length} streaming tracks`);
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

  // Preload next song for smooth transitions
  const handlePreloadSong = async (item, index) => {
    if (item.type !== 'song') return;
    
    try {
      setLoadingMessage(`Preloading ${item.name}...`);
      const details = await TauriCore.invoke('get_song_details', { songId: item.id });
      const songDetails = {
        id: item.id,
        title: item.name,
        tracks: details.tracks
      };
      
      await songTransitionManager.preloadNextSong(songDetails);
      setLoadingMessage(`${item.name} preloaded successfully`);
      setTimeout(() => setLoadingMessage(''), 2000);
    } catch (error) {
      console.error('Error preloading song:', error);
      setLoadingMessage('Error preloading song');
    }
  };

  return (
    <div className="col" id="setlist-col">
      <h2>Service Order</h2>
      <LoadingModal progress={loadingProgress} message={loadingMessage} />
      
      {/* Transition Settings */}
      <div className="transition-settings" style={{ marginBottom: '10px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Transition Settings</h4>
        <label style={{ fontSize: '12px', marginRight: '10px' }}>
          Duration: 
          <input 
            type="range" 
            min="1000" 
            max="8000" 
            step="500"
            defaultValue="3000"
            onChange={(e) => songTransitionManager.setTransitionSettings(parseInt(e.target.value))}
            style={{ marginLeft: '5px', width: '60px' }}
          />
          <span style={{ fontSize: '10px', marginLeft: '5px' }}>3s</span>
        </label>
        <label style={{ fontSize: '12px' }}>
          Type:
          <select 
            defaultValue="logarithmic"
            onChange={(e) => songTransitionManager.setTransitionSettings(undefined, e.target.value)}
            style={{ marginLeft: '5px', fontSize: '11px' }}
          >
            <option value="linear">Linear</option>
            <option value="logarithmic">Logarithmic</option>
            <option value="scurve">S-Curve</option>
          </select>
        </label>
      </div>

      <ul id="setlist">
        {serviceOrder.map((item, index) => (
          <li key={index} className={`setlist-item ${item.loaded ? 'loaded' : ''}`}>
            <div className="item-header">
              <span 
                onClick={() => handleSetlistItemClick(item, index)}
                className="item-name"
              >
                {item.name}
              </span>
              <button onClick={() => handleRemoveItem(index)} className="transition-btn remove">×</button>
            </div>
            
            {/* Transition buttons for songs */}
            {item.type === 'song' && (
              <div className="transition-buttons">
                <button 
                  onClick={() => handleSetlistItemClick(item, index, 'crossfade')}
                  className="transition-btn crossfade"
                  title="Smooth crossfade transition"
                >
                  Crossfade
                </button>
                <button 
                  onClick={() => handleSetlistItemClick(item, index, 'cut')}
                  className="transition-btn cut"
                  title="Instant cut transition"
                >
                  Cut
                </button>
                <button 
                  onClick={() => handleSetlistItemClick(item, index, 'fadeout-fadein')}
                  className="transition-btn fade"
                  title="Fade out then fade in"
                >
                  Fade
                </button>
                <button 
                  onClick={() => handlePreloadSong(item, index)}
                  className="transition-btn preload"
                  title="Preload for instant switching"
                >
                  Preload
                </button>
              </div>
            )}
            
            {/* Standard load for presentations */}
            {item.type === 'presentation' && (
              <div className="transition-buttons">
                <button 
                  onClick={() => handleSetlistItemClick(item, index, 'none')}
                  className="transition-btn load"
                >
                  Load
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetlistManager;