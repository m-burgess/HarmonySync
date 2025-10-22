import React from 'react';
import PanControl from './PanControl.jsx';
import '../../styles/components/TrackControlCard.css';

const TrackControlCard = ({
  trackId,
  trackName,
  panValue = 0,
  isMuted = false,
  onPanChange,
  onMuteToggle,
  className = ''
}) => {
  const handlePanChange = (newPan) => {
    if (onPanChange) {
      onPanChange(trackId, newPan);
    }
  };

  const handleMuteToggle = () => {
    if (onMuteToggle) {
      onMuteToggle(trackId, !isMuted);
    }
  };

  const cardClass = [
    'track-control-card',
    'track-control-simplified',
    isMuted && 'track-muted',
    className
  ].filter(Boolean).join(' ');

  // Format track name for display (remove file extensions, clean up)
  const displayName = trackName
    .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  return (
    <div className={cardClass}>
      <button 
        className={`track-name-button ${isMuted ? 'muted' : ''}`}
        onClick={handleMuteToggle}
        title={`${isMuted ? 'Unmute' : 'Mute'} ${displayName}`}
      >
        {isMuted && <span className="mute-indicator">🔇 </span>}
        {displayName}
      </button>
      
      <div className="track-pan-section">
        <PanControl
          value={panValue}
          onChange={handlePanChange}
          disabled={isMuted}
        />
      </div>
    </div>
  );
};

export default TrackControlCard;