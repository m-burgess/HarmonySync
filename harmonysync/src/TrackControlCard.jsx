import React from 'react';
import PanControl from './PanControl.jsx';
import './styles/components/TrackControlCard.css';

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

  return (
    <div className={cardClass}>
      <button 
        className={`track-name-button ${isMuted ? 'muted' : ''}`}
        onClick={handleMuteToggle}
        title={`${isMuted ? 'Unmute' : 'Mute'} ${trackName}`}
      >
        {trackName}
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