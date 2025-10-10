import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
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

  return (
    <div className="song-library">
      <input
        type="text"
        placeholder="Search for a song..."
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {error && <p className="error-message">{error}</p>}
      <div className="search-results">
        {results.map((song) => (
          <div key={song.id} className="song-item">
            <span>{song.title}</span>
            <button onClick={() => onAddSong(song.id, song.title)} className="add-button">
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
