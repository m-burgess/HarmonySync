import { useState, useEffect } from 'react';
import { fs } from '../../electron-adapter';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

const PreserviceMusic = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasUrl, setHasUrl] = useState(false);

  // Load saved playlist URL on mount
  useEffect(() => {
    if (isOpen) {
      loadPlaylistUrl();
    }
  }, [isOpen]);

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
      
      // Open the URL in external browser
      handleOpenPlaylist();
    } catch (error) {
      console.error('Error saving playlist URL:', error);
      alert('Failed to save playlist URL: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPlaylist = () => {
    if (savedUrl) {
      window.open(savedUrl, '_blank');
    }
  };

  const handleChangeUrl = () => {
    setHasUrl(false);
    setPlaylistUrl(savedUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">Pre-Service Music</h2>
          <button
            onClick={onClose}
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
                    onClick={onClose}
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
            // Saved Playlist
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-200 mb-2">
                  Playlist Saved
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Your pre-service music playlist has been saved.
                </p>
                <p className="text-xs text-gray-500 break-all max-w-2xl">
                  {savedUrl}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleOpenPlaylist}
                  variant="primary"
                  icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
                >
                  Open Playlist in Browser
                </Button>
                <Button
                  onClick={handleChangeUrl}
                  variant="secondary"
                >
                  Change Playlist
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center max-w-md">
                <p>The playlist will open in your default browser where you can control playback.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreserviceMusic;
