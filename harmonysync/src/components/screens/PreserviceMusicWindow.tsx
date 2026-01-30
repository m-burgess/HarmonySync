import React, { useState, useEffect, useRef } from 'react';
import { core, fs } from '../../electron-adapter';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

const PreserviceMusicWindow = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasUrl, setHasUrl] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube IFrame API Ready');
      };
    }
  }, []);

  // Initialize YouTube Player with shuffle when URL is available
  useEffect(() => {
    if (!hasUrl || !savedUrl || !window.YT || !window.YT.Player) {
      return;
    }

    // Wait a bit for DOM to be ready
    const timer = setTimeout(() => {
      try {
        const listMatch = savedUrl.match(/[?&]list=([^&]+)/);
        if (!listMatch) {
          console.log('No playlist ID found in URL');
          return;
        }

        const playlistId = listMatch[1];
        console.log('Initializing player with playlist:', playlistId);
        
        // Create player from scratch (replaces div content)
        playerRef.current = new window.YT.Player('youtube-player-container', {
          height: '100%',
          width: '100%',
          playerVars: {
            listType: 'playlist',
            list: playlistId,
            autoplay: 1,
            loop: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              console.log('YouTube Player Ready');
              // Enable shuffle
              event.target.setShuffle(true);
              event.target.setLoop(true);
              console.log('Shuffle and loop enabled');
            },
            onError: (event) => {
              console.error('YouTube Player Error:', event.data);
              // Error codes: 2=invalid ID, 5=HTML5 error, 100=not found, 101/150=not embeddable
              if (event.data === 150 || event.data === 101) {
                console.warn('Video cannot be embedded, but playlist should continue...');
              }
            },
            onStateChange: (event) => {
              console.log('Player state:', event.data);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube Player:', error);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [hasUrl, savedUrl]);

  // Load saved playlist URL on mount
  useEffect(() => {
    loadPlaylistUrl();
  }, []);

  const loadPlaylistUrl = async () => {
    try {
      setIsLoading(true);
      const configPath = await getConfigPath();
      
      try {
        const content = await fs.readTextFile(configPath);
        const config = JSON.parse(content);
        
        if (config.preservicePlaylistUrl) {
          setSavedUrl(config.preservicePlaylistUrl);
          setPlaylistUrl(config.preservicePlaylistUrl);
          setHasUrl(true);
        }
      } catch (err) {
        // File doesn't exist yet, that's okay
        console.log('No saved playlist URL found');
      }
    } catch (error) {
      console.error('Error loading playlist URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfigPath = async () => {
    return '/preservice-config.json'; // Will be stored in app data
  };

  const handleSaveUrl = async () => {
    if (!playlistUrl.trim()) {
      alert('Please enter a valid playlist URL');
      return;
    }

    try {
      setIsLoading(true);
      const configPath = await getConfigPath();

      const config = {
        preservicePlaylistUrl: playlistUrl.trim(),
        savedAt: new Date().toISOString()
      };

      await fs.writeTextFile(configPath, JSON.stringify(config, null, 2));
      
      setSavedUrl(playlistUrl.trim());
      setHasUrl(true);
      console.log('Playlist URL saved successfully');
    } catch (error) {
      console.error('Error saving playlist URL:', error);
      alert('Failed to save playlist URL: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeUrl = () => {
    setHasUrl(false);
    setPlaylistUrl(savedUrl);
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  return (
    <div className="h-screen w-screen bg-gray-800 flex flex-col border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100">Pre-Service Music</h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : !hasUrl ? (
          // URL Input Form
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">
                Enter Your Playlist URL
              </h3>
              <p className="text-sm text-gray-400">
                Paste a YouTube Music or YouTube playlist link to play pre-service music
              </p>
            </div>

            <div className="w-full max-w-2xl space-y-4">
              <Input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://music.youtube.com/playlist?list=..."
                className="w-full"
              />

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleSaveUrl}
                  variant="primary"
                  disabled={!playlistUrl.trim()}
                >
                  Save & Play
                </Button>
                <Button
                  onClick={handleClose}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 max-w-2xl">
              <p className="mb-2">Examples:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>YouTube Music: https://music.youtube.com/playlist?list=...</li>
                <li>YouTube Playlist: https://www.youtube.com/playlist?list=...</li>
              </ul>
            </div>
          </div>
        ) : (
          // Music Player
          <div className="flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Playing playlist with shuffle and loop enabled
              </p>
              <Button
                onClick={handleChangeUrl}
                variant="secondary"
                size="small"
              >
                Change Playlist
              </Button>
            </div>

            <div className="flex-1 bg-black rounded-lg overflow-hidden">
              {/* YouTube Player API will replace this div with an iframe */}
              <div
                id="youtube-player-container"
                ref={iframeRef}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreserviceMusicWindow;
