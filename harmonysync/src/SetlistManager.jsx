import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { loadAudioFile, setPan, playAllTracks, stopAllAudio, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks, cleanupAudio } from './audio.js';
import { parseLyricsToSlides } from './lyrics.js';
import { getVideoMetadata } from './video.js';

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

  const handleSetlistItemClick = async (itemPath) => {
    console.log('Folder clicked:', itemPath);
    setLoadingProgress(0);
    setLoadingMessage('Loading folder contents...');

    const unlisten = await TauriEvent.listen('ogg-conversion-progress', (event) => {
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

              const processedAudioFiles = await Promise.all(audioFiles.map(async (file) => {
              const originalPath = `${itemPath}/${file.name}`;
              const fileNameWithOgg = file.name.endsWith('.ogg') ? file.name : `${file.name}.ogg`;
              const targetCachePathAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache', fileNameWithOgg);
              console.log("targetCachePathAbsolute:", targetCachePathAbsolute); // Debugging line
      
              if (!file.name.endsWith('.ogg')) {
                setLoadingMessage(`Converting ${file.name} to Ogg...`);
                try {
                  // Invoke the Rust command to convert, assuming it returns the path to the converted file
                  const tempOggPath = await TauriCore.invoke('convert_to_ogg', { inputPath: originalPath });
                  // Ensure the cache directory exists
                  const cacheDirAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache');
                  await TauriFs.mkdir(cacheDirAbsolute, { recursive: true });
                  // Copy the converted file to the public cache directory
                  await TauriFs.copyFile(tempOggPath, targetCachePathAbsolute);
                  // Delete the temporary file
                  await TauriFs.remove(tempOggPath);
                  // Return the file object with the path set to the relative URL for the web audio API
                  return { ...file, path: targetCachePathAbsolute, name: fileNameWithOgg }; // Path is now absolute for convertFileSrc
                } catch (error) {
                  console.error(`Error converting ${file.name} to Ogg:`, error);
                  return null; // Skip this file if conversion fails
                }
              } else {
                // If it's already an OGG, copy it to the cache if it's not already there
                // This handles cases where originalPath might not be in the public/cache
                const sourcePath = originalPath;
                const cacheDirAbsolute = await TauriPath.join(await TauriPath.appLocalDataDir(), 'harmonysync', 'cache');
                await TauriFs.mkdir(cacheDirAbsolute, { recursive: true });
                await TauriFs.copyFile(sourcePath, targetCachePathAbsolute);
                return { ...file, path: targetCachePathAbsolute, name: fileNameWithOgg }; // Path is now absolute for convertFileSrc
              }
            }));
      const validAudioFiles = processedAudioFiles.filter(Boolean);

      const lyricsFile = entries.find(entry => entry.name === 'lyrics.txt' && entry.children === undefined);
      let loadedSlides = [];
      let totalFilesToLoad = validAudioFiles.length;
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
          loadedSlides = [...videoSlides, ...imageSlides];
        }
      }

      console.log('loadedSlides:', loadedSlides);
      setAllSlides(loadedSlides); // Update the allSlides state in App.jsx



      const loadedTracks = [];
      setLoadingMessage('Loading audio tracks...');
      const loadingPromises = validAudioFiles.map(async (file) => {
        const fileName = file.name;
        // Use the absolute path from the processed file for fetching
        const trackPath = file.path; // This should now be the absolute path
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
    } finally {
      unlisten(); // Clean up the event listener
      unlistenVideoTranscode();
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
          <li key={index} className="setlist-item" >
            <span onClick={() => handleSetlistItemClick(item.path)}>{item.name}</span>
            <button onClick={() => handleSetBackgroundClick(item.path)}>Set Background</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetlistManager;