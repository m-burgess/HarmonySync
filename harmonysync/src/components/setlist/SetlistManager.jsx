import React, { useState, useEffect, useRef } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import * as TauriPath from '@tauri-apps/api/path';
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import { ArrowDownTrayIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { 
  addTracks, 
  setPan, 
  playAllTracks, 
  stopAllAudio, 
  goToBeginningAllTracks, 
  getTracks, 
  clearAudioBufferCache, 
  clearTracks, 
  cleanupAudio,
  initializeAudioService,
  crossfadeToTracks,
  setCrossfadeDuration,
  onPlaybackComplete,
  offPlaybackComplete
} from '../../utils/audio';
import { songTransitionManager } from '../../utils/audio';

import { parseLyricsToSlides } from '../../utils/lyrics';

const SetlistManager = ({ setAllSlides, setAllTracks, setIsLoadingTracks }) => {
  const [setlist, setSetlist] = useState([]);
  const [currentBackgroundCssContent, setCurrentBackgroundCssContent] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [preloadedSongs, setPreloadedSongs] = useState(new Set()); // Track which songs are preloaded
  const [crossfadeDuration, setCrossfadeDurationState] = useState(3000); // 3 second default
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first song load
  const [currentLoadedFolder, setCurrentLoadedFolder] = useState(null); // Track currently loaded folder
  const [currentSongIndex, setCurrentSongIndex] = useState(-1); // Track current song in setlist
  const [autoplayEnabled, setAutoplayEnabled] = useState(false); // Enable/disable autoplay
  
  // Ref to prevent duplicate loading calls (React.StrictMode protection)
  const loadingInProgressRef = useRef(false);

  // Autoplay effect - listen for playback completion and advance to next song
  useEffect(() => {
    const handlePlaybackComplete = (data) => {
      console.log('🎵 Playback completed, checking autoplay...', { autoplayEnabled, currentSongIndex, setlistLength: setlist.length });
      
      if (autoplayEnabled && currentSongIndex >= 0 && currentSongIndex < setlist.length - 1) {
        const nextIndex = currentSongIndex + 1;
        const nextSong = setlist[nextIndex];
        
        console.log(`🎵 Auto-advancing to next song: ${nextSong.name} (${nextIndex + 1}/${setlist.length})`);
        
        setTimeout(() => {
          handleSetlistItemClick(nextSong);
          setCurrentSongIndex(nextIndex);
        }, 1000); // 1 second delay before next song
      } else if (autoplayEnabled && currentSongIndex >= setlist.length - 1) {
        console.log('🎵 Reached end of setlist, autoplay stopping');
        setCurrentSongIndex(-1);
      }
    };

    // Register the event handler
    onPlaybackComplete(handlePlaybackComplete);

    // Cleanup on unmount
    return () => {
      offPlaybackComplete(handlePlaybackComplete);
    };
  }, [autoplayEnabled, currentSongIndex, setlist]);

  // Update current song index when manually clicking setlist items
  const handleSetlistItemClickWithIndex = async (item, index) => {
    setCurrentSongIndex(index);
    await handleSetlistItemClick(item);
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

          // Check if this path is already in the setlist
          const existingItem = setlist.find(item => item.path === path);
          if (existingItem) {
            console.log(`📁 Folder "${folderName}" is already in the setlist, skipping...`);
            continue;
          }

          // Detect an 'ogg' subfolder. If present, treat this as a song and record its tracks and optional lyrics.
          const oggDir = await TauriPath.join(path, 'ogg');
          const oggExists = await TauriFs.exists(oggDir);

          // Generate a unique ID for this setlist item
          const itemId = `setlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          let item = { 
            id: itemId,
            path: path, 
            name: folderName 
          };

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

  const handleEditLyrics = async (item) => {
    if (!item || item.type !== 'song') {
      console.warn('Edit lyrics called for non-song item:', item);
      return;
    }

    const lyricsPath = `${item.path}/lyrics.txt`;
    try {
      // Check if lyrics file exists
      const exists = await TauriFs.exists(lyricsPath);
      if (!exists) {
        await TauriDialog.message('No lyrics.txt file found in this song folder.', { title: 'Lyrics Not Found', type: 'info' });
        return;
      }

      // Open the lyrics file with the default text editor
      await TauriCore.invoke('open_lyrics_file', { path: lyricsPath });
    } catch (error) {
      console.error('Failed to open lyrics file:', error);
      await TauriDialog.message(`Failed to open lyrics file: ${error}`, { title: 'Error', type: 'error' });
    }
  };
    
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
        // Mark song as preloaded using item ID for better tracking
        setPreloadedSongs(prev => new Set([...prev, item.id || item.path]));
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
    console.log('📁 [SetlistManager] Setlist item clicked:', item);
    
    // Prevent duplicate calls (React.StrictMode protection)
    if (loadingInProgressRef.current) {
      console.log('🚫 [SetlistManager] Loading already in progress, ignoring duplicate call');
      return;
    }
    
    // Check if this folder is already loaded
    if (currentLoadedFolder === itemPath) {
      console.log('⚠️  Same folder already loaded, ignoring duplicate request:', itemPath);
      setLoadingMessage('This song is already loaded');
      setTimeout(() => setLoadingMessage(''), 2000);
      return;
    }
    
    // Set loading flag to prevent duplicates
    loadingInProgressRef.current = true;
    
    console.log(`🎵 Loading setlist item: ${item.name}`);
    console.log(`🔍 Current folder: ${currentLoadedFolder} | New folder: ${itemPath}`);
    console.log(`🔍 isFirstLoad: ${isFirstLoad}, currentLoadedFolder: ${currentLoadedFolder}`);
    
    // Set the current folder immediately to prevent race conditions
    setCurrentLoadedFolder(itemPath);
    
    setLoadingProgress(0);
    setLoadingMessage('Loading folder contents...');

    try {
      // If this is not the first load, use crossfade for smooth transition
      const shouldUseCrossfade = !isFirstLoad && currentLoadedFolder;
      
      if (!shouldUseCrossfade) {
        // First load or no previous tracks - clear everything
        stopAllAudio();
        await clearTracks();  // Wait for tracks to be cleared before proceeding
        console.log('🧹 Tracks cleared, proceeding with fresh load');
      }
      
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
      let hasOggFolder = false;
      
      if (item.tracks && Array.isArray(item.tracks) && item.tracks.length > 0) {
        // This item has pre-scanned tracks (from Add Folder with ogg detection)
        trackEntries = item.tracks.map(t => ({ file_path: t.file_path, track_name: t.track_name }));
        hasOggFolder = true; // If tracks are present, it means an ogg folder existed
      } else {
        // Check if this folder has audio files directly
        const audioFiles = entries.filter(entry => entry.children === undefined && (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.ogg'))).sort((a,b)=>a.name.localeCompare(b.name));
        trackEntries = audioFiles.map(f => ({ file_path: `${itemPath}/${f.name}`, track_name: f.name }));
        hasOggFolder = audioFiles.some(f => f.name.endsWith('.ogg')); // Consider it has ogg content if there are ogg files
      }

      // Auto-clear cache if this is a presentation folder (no OGG folder/tracks)
      if (!hasOggFolder && trackEntries.length === 0) {
        console.log('No audio tracks found - clearing cache automatically');
        clearAudioBufferCache();
        setPreloadedSongs(new Set());
      }

      setLoadingMessage('Loading audio tracks...');
      setIsLoadingTracks(true);

      // Extract file paths from track entries
      const trackPaths = trackEntries.map(t => t.file_path);
      
      console.log(`🎵 About to load ${trackPaths.length} tracks from folder: ${itemPath}`);
      console.log(`🔍 Track paths:`, trackPaths);
      
      try {
        let results;
        
        // Use crossfade if this isn't the first load and we have tracks to fade from
        const existingTracks = getTracks();
        const shouldUseCrossfade = !isFirstLoad && trackPaths.length > 0 && existingTracks.length > 0;
        
        console.log(`🎵 Crossfade decision: shouldUseCrossfade=${shouldUseCrossfade}`);
        console.log(`  - isFirstLoad: ${isFirstLoad}`);
        console.log(`  - trackPaths.length: ${trackPaths.length}`);
        console.log(`  - existingTracks.length: ${existingTracks.length}`);
        console.log(`  - existingTracks:`, existingTracks.map(t => t.name || t.id || 'unnamed'));
        
        if (shouldUseCrossfade) {
          setLoadingMessage(`Crossfading to ${trackPaths.length} tracks...`);
          console.log(`🎵 Crossfading to new tracks (${crossfadeDuration}ms duration)`);
          
          // Use crossfade for smooth transitions
          results = await crossfadeToTracks(trackPaths, crossfadeDuration);
          
          // Get the updated track list after crossfade
          const updatedTracks = getTracks();
          setAllTracks([...updatedTracks]);
          
          setLoadingMessage(`Crossfade complete! ${trackPaths.length} tracks loaded.`);
        } else {
          // First load or no existing tracks - use regular loading
          setLoadingMessage('Loading audio tracks...');
          results = await addTracks(trackPaths);
          
          // Create track objects for UI (lightweight, no audio buffers)
          const loadedTracks = results
            .filter(result => result.success)
            .map((result, index) => {
              const trackEntry = trackEntries.find(t => t.file_path === result.path);
              return {
                id: result.trackId, // Node.js service track ID
                path: result.path,
                name: trackEntry?.track_name || 'Unknown Track',
                panValue: 0,
                isMuted: false,
                isPlaying: false,
                individualVolume: 0.7,
                // No buffer, gainNode, pannerNode - handled by Node.js service
              };
            });

          // Update tracks in state
          setAllTracks([...loadedTracks]);
          setLoadingMessage(`Loading complete! ${loadedTracks.length} tracks loaded.`);
        }
        
        console.log(`✅ Loaded ${trackPaths.length} tracks using Node.js audio service`);
        
        // Note: currentLoadedFolder was already set at the beginning to prevent race conditions
        setIsFirstLoad(false); // Mark that we've loaded at least one song
        
      } catch (error) {
        console.error('Failed to load tracks:', error);
        setLoadingMessage('Error loading tracks');
        // Reset current folder on error so user can retry
        setCurrentLoadedFolder(null);
      }
      setLoadingProgress(100);
      setIsLoadingTracks(false);
      
      // Clear loading flag
      loadingInProgressRef.current = false;

    } catch (error) {
      console.error('Error loading setlist item:', error);
      try { TauriDialog.message(`Failed to load setlist from ${itemPath}.`, { title: 'Error', type: 'error' }); } catch(e){}
      setLoadingMessage('Error loading folder.');
      setLoadingProgress(0);
      setIsLoadingTracks(false);
      // Reset current folder on error so user can retry
      setCurrentLoadedFolder(null);
      
      // Clear loading flag
      loadingInProgressRef.current = false;
    }
  };

  return (
    <div className="col" id="setlist-col">
      {/* Crossfade Control */}
      <div className="mb-2 p-2 bg-stage rounded border border-surface">
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="crossfade-duration" className="font-medium text-primary">
            Crossfade:
          </label>
          <input
            id="crossfade-duration"
            type="range"
            min="500"
            max="8000"
            step="500"
            value={crossfadeDuration}
            onChange={async (e) => {
              const duration = parseInt(e.target.value);
              setCrossfadeDurationState(duration);
              try {
                await setCrossfadeDuration(duration);
              } catch (error) {
                console.error('Failed to set crossfade duration:', error);
              }
            }}
            className="w-20"
          />
          <span className="text-muted min-w-fit">
            {(crossfadeDuration / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Autoplay Control */}
      <div className="mb-2 p-2 bg-stage rounded border border-surface">
        <div className="flex items-center gap-2 text-xs">
          <input
            id="autoplay-enabled"
            type="checkbox"
            checked={autoplayEnabled}
            onChange={(e) => setAutoplayEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="autoplay-enabled" className="font-medium text-primary">
            Autoplay next song
          </label>
          {currentSongIndex >= 0 && (
            <span className="text-muted ml-auto">
              {currentSongIndex + 1}/{setlist.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button onClick={handleAddFolder} id="add-folder-button" style={{ flex: 1 }}>
          Add to Service Order
        </button>
      </div>
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
          const isPreloaded = preloadedSongs.has(item.id || item.path);
          const isCurrentSong = currentSongIndex === index;
          
          return (
            <li 
              key={item.id || `fallback-${index}`} 
              className={`setlist-item ${isCurrentSong ? 'current-song' : ''}`}
              onClick={() => handleSetlistItemClickWithIndex(item, index)}
              style={{ 
                backgroundColor: isCurrentSong ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderLeft: isCurrentSong ? '3px solid #3b82f6' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: 1 }} onClick={() => handleSetlistItemClickWithIndex(item, index)}>
                  {isCurrentSong && '▶ '}{item.name}
                </span>
                {item.type === 'song' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.lyrics && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditLyrics(item); }}
                        title="Edit lyrics"
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid currentColor',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreloadSong(item); }}
                      title={isPreloaded ? "Song is preloaded and ready" : "Preload song"}
                      style={{ 
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
                  </div>
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