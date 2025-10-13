import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
import { PlusIcon } from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import './SongLibrary.css';
import { exportSongFolder } from '../songExport.js';

const SongLibrary = ({ onAddSong, songImportedTrigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Debounce search term to avoid too many backend calls
  useEffect(() => {
    let isMounted = true;
    const handler = setTimeout(() => {
      Tauri.core.invoke('get_all_songs_json')
        .then((songs) => {
          if (!isMounted) return;
          const lower = searchTerm.toLowerCase();
          const filtered = songs.filter(s => s.title.toLowerCase().includes(lower));
          // Map to expected shape (id/title)
          const mapped = filtered.map((s, idx) => ({ id: idx, title: s.title }));
          setResults(mapped);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load song library.');
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [searchTerm, songImportedTrigger]);

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
            <div className="flex items-center gap-2">
              <button aria-label={`Add ${song.title} to setlist`} title="Add" onClick={() => onAddSong(song.id, song.title)} className="add-button p-1 rounded bg-surface">
                <PlusIcon className="w-4 h-4 text-primary" />
              </button>
              <button aria-label={`Export ${song.title}`} title="Export" onClick={async () => {
                const r = await exportSongFolder(song.title);
                if (r.cancelled) return;
                if (r.ok) alert(r.message);
                else alert(`Export failed: ${r.error}`);
              }} className="export-button p-1 rounded bg-surface">
                <ArrowDownTrayIcon className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
