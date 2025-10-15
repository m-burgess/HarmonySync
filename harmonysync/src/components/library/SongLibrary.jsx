import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
import { LibraryItem } from './components';
import '../../styles/SongLibrary.css';

const SongLibrary = ({ onAddSong, songImportedTrigger }) => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Load library once; searching is handled by the file explorer externally
  useEffect(() => {
    Tauri.core.invoke('search_songs', { searchTerm: '' })
      .then(setResults)
      .catch(err => {
        console.error(err);
        setError('Failed to load songs.');
      });
  }, [songImportedTrigger]);

  return (
    <div className="song-library">
      {/* Search removed: file explorer will handle searching. */}
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
            showAddButton={true}
          />
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
