import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
import { PlusIcon } from '@heroicons/react/24/solid';
import './PresentationLibrary.css';

const PresentationLibrary = ({ onAddPresentationToSetlist, presentationImportedTrigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Debounce search term to avoid too many backend calls
  useEffect(() => {
    const handler = setTimeout(() => {
      Tauri.core.invoke('search_presentations', { searchTerm })
        .then(setResults)
        .catch(err => {
          console.error(err);
          setError('Failed to search for presentations.');
        });
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, presentationImportedTrigger]); // Dependencies remain the same

  return (
    <div className="song-library">
      <input
        type="text"
        placeholder="Search for a presentation..."
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {error && <p className="error-message">{error}</p>}
      <div className="search-results">
        {results.map((presentation) => (
          <div key={presentation.id} className="song-item">
            <span>{presentation.name}</span>
            <button aria-label={`Add ${presentation.name} to setlist`} title="Add" onClick={() => onAddPresentationToSetlist(presentation.id, presentation.name)} className="add-button p-1 rounded bg-surface">
              <PlusIcon className="w-4 h-4 text-primary" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PresentationLibrary;
