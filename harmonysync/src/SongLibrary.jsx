import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Input, LibraryItem } from './components';
import './SongLibrary.css';

const SongLibrary = ({ onAddSong, songImportedTrigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Debounce search term to avoid too many backend calls
  useEffect(() => {
    const handler = setTimeout(() => {
      Tauri.core.invoke('search_songs', { searchTerm })
        .then(setResults)
        .catch(err => {
          console.error(err);
          setError('Failed to search for songs.');
        });
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, songImportedTrigger]); // Dependencies remain the same

  const handleExportSong = async (songId, songTitle) => {
    try {
      // Open dialog to select destination folder
      const selectedPath = await TauriDialog.open({
        directory: true,
        multiple: false,
        title: `Export "${songTitle}" to folder`,
      });

      if (typeof selectedPath === 'string') {
        console.log(`Exporting song ${songId} to: ${selectedPath}`);
        await Tauri.core.invoke('export_song_folder', {
          songId: songId,
          destinationPath: selectedPath,
        });
        alert(`Song "${songTitle}" exported successfully to:\n${selectedPath}`);
      } else {
        console.log('Export cancelled.');
      }
    } catch (error) {
      console.error('Failed to export song:', error);
      alert(`Error exporting song: ${error}`);
    }
  };

  return (
    <div className="song-library">
      <Input
        type="text"
        placeholder="Search for a song..."
        variant="search"
        icon={<MagnifyingGlassIcon />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {error && <p className="error-message">{error}</p>}
      <div className="search-results">
        {results.map((song) => (
          <LibraryItem
            key={song.id}
            item={{
              id: song.id,
              name: song.title,
              type: 'song'
            }}
            onAdd={(item) => onAddSong(item.id, item.name)}
            onExport={(item) => handleExportSong(item.id, item.name)}
            showAddButton={true}
            showExportButton={true}
          />
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
