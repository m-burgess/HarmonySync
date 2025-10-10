import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
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
            <button onClick={() => onAddPresentationToSetlist(presentation.id, presentation.name)} className="add-button">
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PresentationLibrary;
