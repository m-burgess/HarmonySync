import React, { useState } from 'react';
import SongLibrary from './SongLibrary.jsx';
import './styles/LibraryTabs.css';
import PresentationLibrary from './PresentationLibrary.jsx';

const LibraryTabs = ({ onAddSongToSetlist, onAddPresentationToSetlist, songImportedTrigger, presentationImportedTrigger }) => {
  const [activeTab, setActiveTab] = useState('songs');

  return (
    <div className="library-container">
      <div className="library-tabs">
        <button
          className={`tab-button ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          Songs
        </button>
        <button
          className={`tab-button ${activeTab === 'presentations' ? 'active' : ''}`}
          onClick={() => setActiveTab('presentations')}
        >
          Presentations
        </button>
      </div>
      <div className="library-content">
        {activeTab === 'songs' && (
          <SongLibrary onAddSong={onAddSongToSetlist} songImportedTrigger={songImportedTrigger} />
        )}
        {activeTab === 'presentations' && (
          <PresentationLibrary onAddPresentationToSetlist={onAddPresentationToSetlist} presentationImportedTrigger={presentationImportedTrigger} />
        )}
      </div>
    </div>
  );
};

export default LibraryTabs;
