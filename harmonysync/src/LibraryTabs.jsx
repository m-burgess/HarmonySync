import React, { useState } from 'react';
import './LibraryTabs.css';

const LibraryTabs = ({ onAddSongToSetlist, onAddPresentationToSetlist, songImportedTrigger, presentationImportedTrigger }) => {
  return (
    <div className="library-container">
      <div className="library-content">
        <div className="placeholder-content">
          <div>
            <p style={{color: '#bbb'}}>Song and Presentation libraries have been removed.</p>
            <p style={{color: '#888', fontSize: 13}}>Use your file explorer and the "Add Folder" button to add content to the setlist.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryTabs;
