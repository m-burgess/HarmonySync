import React, { useState, useEffect } from 'react';
import * as Tauri from '@tauri-apps/api';
import { PlusIcon } from '@heroicons/react/24/solid';
import '../../styles/PresentationLibrary.css';

const PresentationLibrary = ({ onAddPresentationToSetlist, presentationImportedTrigger }) => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Load presentations once; searching is handled externally by file explorer
  useEffect(() => {
    Tauri.core.invoke('search_presentations', { searchTerm: '' })
      .then(setResults)
      .catch(err => {
        console.error(err);
        setError('Failed to load presentations.');
      });
  }, [presentationImportedTrigger]);

  return (
    <div className="song-library">
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
