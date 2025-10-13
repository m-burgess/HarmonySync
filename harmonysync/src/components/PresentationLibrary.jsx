import React from 'react';

const PresentationLibrary = ({ presentations, onOpen }) => {
  return (
    <div id="presentation-library" className="p-2">
      {presentations && presentations.length > 0 ? (
        <ul>
          {presentations.map((p, i) => (
            <li key={i} className="p-1 hover:bg-surface cursor-pointer" onClick={() => onOpen(p)}>{p.name}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted">No presentations</div>
      )}
    </div>
  );
};

export default PresentationLibrary;
