import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { loadAudioFile, setPan, playAllTracks, stopAllAudio, goToBeginningAllTracks, applyDefaultPanning, getAudioContext, getTracks, clearAudioBufferCache, clearTracks, cleanupAudio, preloadTrack, loadSongTracksForStreaming } from '../../utils/audio';
import { songTransitionManager } from '../../utils/audio';

import { parseLyricsToSlides } from '../../utils/lyrics';

const SetlistManager = ({ setAllSlides, setAllTracks }) => {
  const [setlist, setSetlist] = useState([]);
  const [currentBackgroundCssContent, setCurrentBackgroundCssContent] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [preloadedSongs, setPreloadedSongs] = useState(new Set()); // Track which songs are preloaded

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

          // Detect an 'ogg' subfolder. If present, treat this as a song and record its tracks and optional lyrics.
          const oggDir = await TauriPath.join(path, 'ogg');
          const oggExists = await TauriFs.exists(oggDir);

          let item = { path: path, name: folderName };

          if (oggExists) {
            try {
              const oggEntries = await TauriFs.readDir(oggDir, { recursive: false });
              const tracks = oggEntries
                .filter(e => e.children === undefined && e.name.endsWith('.ogg'))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(e => ({ file_path: `${oggDir}/${e.name}`, track_name: e.name }));

              // attempt to read lyrics.txt from the root folder
              let lyrics = '';
              const entries = await TauriFs.readDir(path, { recursive: false });
              const lyricsFile = entries.find(entry => entry.name === 'lyrics.txt' && entry.children === undefined);
              if (lyricsFile) {
                let lyricsContent = await TauriFs.readFile(`${path}/${lyricsFile.name}`, { encoding: 'utf8' });
                if (lyricsContent instanceof Uint8Array) lyricsContent = new TextDecoder().decode(lyricsContent);
                lyrics = typeof lyricsContent === 'string' ? lyricsContent : '';
              }

              item = { ...item, type: 'song', tracks, lyrics, loaded: false };
            } catch (e) {
              console.warn('Failed to read ogg dir contents for', path, e);
            }
          }

          setSetlist((prevSetlist) => [...prevSetlist, item]);
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handlePreloadSong = async (item) => {
    if (!item || item.type !== 'song') {
      console.warn('Preload called for non-song item:', item);
      return;
    }

    setLoadingMessage(`Preloading ${item.name}...`);
    setLoadingProgress(0);
    
    try {
      const tracks = item.tracks || [];
      if (tracks.length === 0) {
        console.warn('No tracks to preload for:', item);
        setLoadingMessage(`No tracks found for ${item.name}`);
        setTimeout(() => { setLoadingMessage(''); setLoadingProgress(0); }, 1500);
        return;
      }

      // Preload each track using streaming mode (low memory)
      let successCount = 0;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        try {
          // Convert file path to Tauri asset URL
          const assetUrl = TauriCore.convertFileSrc(track.file_path);
          console.log(`[handlePreloadSong] Preloading track ${i + 1}/${tracks.length}: ${track.track_name}`);
          
          // Use streaming mode (decode: false) for low memory footprint
          await preloadTrack(assetUrl, { decode: false, timeout: 15000 });
          successCount++;
          
          setLoadingProgress(Math.round(((i + 1) / tracks.length) * 100));
        } catch (err) {
          console.error(`[handlePreloadSong] Error preloading track ${track.track_name}:`, err);
          // Continue with other tracks even if one fails
        }
      }

      if (successCount > 0) {
        setLoadingMessage(`✓ ${item.name} ready (${successCount}/${tracks.length} tracks)`);
        // Mark song as preloaded
        setPreloadedSongs(prev => new Set([...prev, item.path]));
      } else {
        setLoadingMessage(`Preload failed for ${item.name}`);
      }
    } catch (e) {
      console.error('Error preloading song:', e);
      setLoadingMessage('Error during preload');
    }

    setTimeout(() => {
      setLoadingMessage('');
      setLoadingProgress(0);
    }, 2000);
  };

  const handleSetlistItemClick = async (itemOrPath) => {
    // itemOrPath may be an object (from setlist) or a path string (legacy). Support both.
    const item = typeof itemOrPath === 'string' ? { path: itemOrPath } : itemOrPath;
    const itemPath = item.path;
    console.log('Setlist item clicked:', item);
    setLoadingProgress(0);
    setLoadingMessage('Loading folder contents...');

    try {
      cleanupAudio();
      clearTracks();
      TauriEvent.emit('clear-lyric-display');
      TauriEvent.emit('clear-confidence-display');

      // Read folder entries
      const entries = await TauriFs.readDir(itemPath, { recursive: false });

      // Slides: prefer lyrics.txt, else images/videos
      const lyricsFile = entries.find(e => e.name === 'lyrics.txt' && e.children === undefined);
      let loadedSlides = [];
      if (lyricsFile) {
        setLoadingMessage('Loading lyrics...');
        let lyricsContent = await TauriFs.readFile(`${itemPath}/${lyricsFile.name}`, { encoding: 'utf8' });
        if (lyricsContent instanceof Uint8Array) lyricsContent = new TextDecoder().decode(lyricsContent);
        if (typeof lyricsContent === 'string' && lyricsContent.length > 0) {
          loadedSlides = parseLyricsToSlides(lyricsContent);
        }
      } else {
        const videoFiles = entries.filter(entry => entry.children === undefined && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mov') || entry.name.endsWith('.mkv'))).sort((a,b)=>a.name.localeCompare(b.name));
        const imageFiles = entries.filter(entry => entry.children === undefined && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.gif') || entry.name.endsWith('.webp'))).sort((a,b)=>a.name.localeCompare(b.name));

        // Fetch metadata (duration, thumbnail) for videos via Tauri command
        setLoadingMessage('Loading video metadata...');
        const videoSlidesPromises = videoFiles.map(async (file) => {
          const filePath = `${itemPath}/${file.name}`;
          try {
            const metadata = await TauriCore.invoke('get_video_metadata', { path: filePath });
            return {
              type: 'video',
              path: filePath,
              name: file.name,
              duration: metadata && metadata.duration ? metadata.duration : undefined,
              thumbnail_path: metadata && metadata.thumbnail_path ? metadata.thumbnail_path : undefined,
            };
          } catch (err) {
            console.warn('Failed to get metadata for', filePath, err);
            return { type: 'video', path: filePath, name: file.name };
          }
        });

        const videoSlides = (await Promise.all(videoSlidesPromises)).filter(Boolean);
        const imageSlides = imageFiles.map(file => ({ type: 'image', path: `${itemPath}/${file.name}`, name: file.name }));

        // Check for a youtube.txt file listing YouTube links (one per line)
        const youtubeFile = entries.find(entry => entry.name === 'youtube.txt' && entry.children === undefined);
        if (youtubeFile) {
          setLoadingMessage('Loading YouTube links...');
          const youtubePath = `${itemPath}/${youtubeFile.name}`;
          let youtubeContent = await TauriFs.readFile(youtubePath, { encoding: 'utf8' });
          if (youtubeContent instanceof Uint8Array) youtubeContent = new TextDecoder().decode(youtubeContent);
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
              const m = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              const videoId = m && m[1] ? m[1] : null;
              if (!videoId) return null;
              return { type: 'youtube', videoId, name };
            }).filter(Boolean);
            loadedSlides = [...videoSlides, ...imageSlides, ...youtubeSlides];
          } else {
            loadedSlides = [...videoSlides, ...imageSlides];
          }
        } else {
          loadedSlides = [...videoSlides, ...imageSlides];
        }
      }

      setAllSlides(loadedSlides);

      // Emit background CSS
      try {
        const backgroundCssContent = await TauriCore.invoke('generate_background_css', { path: itemPath });
        setCurrentBackgroundCssContent(backgroundCssContent);
        TauriEvent.emit('set-background', backgroundCssContent);
      } catch (e) {
        // non-fatal
      }

      // Audio tracks: if the setlist item already has `tracks` metadata (from Add Folder ogg detection), use that, else scan for audio files
      let trackEntries = [];
      if (item.tracks && Array.isArray(item.tracks) && item.tracks.length > 0) {
        trackEntries = item.tracks.map(t => ({ file_path: t.file_path, track_name: t.track_name }));
      } else {
        const audioFiles = entries.filter(entry => entry.children === undefined && (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.ogg'))).sort((a,b)=>a.name.localeCompare(b.name));
        trackEntries = audioFiles.map(f => ({ file_path: `${itemPath}/${f.name}`, track_name: f.name }));
      }

      setLoadingMessage('Loading audio tracks...');
      setLoadingProgress(50);
      
      // Use streaming audio system
      const loadedTracks = await loadSongTracksForStreaming(trackEntries);
      
      // Add tracks to global tracks array
      // Note: Web Audio nodes (source, gainNode, pannerNode) will be created 
      // lazily by playAllTracks() when first played
      for (const track of loadedTracks) {
        track.isMuted = false;
        track.offset = 0;
        track.volume = 0.7;
        getTracks().push(track);
      }

      applyDefaultPanning(loadedTracks);
      // replace allTracks in App
      setAllTracks([...loadedTracks]);

      setLoadingMessage('Loading complete!');
      setLoadingProgress(100);

    } catch (error) {
      console.error('Error loading setlist item:', error);
      try { TauriDialog.message(`Failed to load setlist from ${itemPath}.`, { title: 'Error', type: 'error' }); } catch(e){}
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
        {setlist.map((item, index) => {
          const isPreloaded = preloadedSongs.has(item.path);
          
          return (
            <li key={index} className="setlist-item" onClick={() => handleSetlistItemClick(item)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: 1 }} onClick={() => handleSetlistItemClick(item)}>{item.name}</span>
                {item.type === 'song' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePreloadSong(item); }}
                    title={isPreloaded ? "Song is preloaded and ready" : "Preload song"}
                    style={{ 
                      marginLeft: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: isPreloaded ? '#10b981' : 'transparent',
                      color: isPreloaded ? 'white' : 'inherit',
                      border: isPreloaded ? 'none' : '1px solid currentColor',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isPreloaded ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Ready</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Preload</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SetlistManager;