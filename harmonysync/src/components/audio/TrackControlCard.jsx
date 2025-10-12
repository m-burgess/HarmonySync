import React from 'react';
import Button from '../ui/Button.jsx';
import VolumeSlider from './VolumeSlider.jsx';
import PanControl from './PanControl.jsx';
import './TrackControlCard.css';

const TrackControlCard = ({
  trackId,
  trackName,
  volume = 0.5,
  panValue = 0,
  isMuted = false,
  isSolo = false,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  className = ''
}) => {
  const handleVolumeChange = (newVolume) => {
    if (onVolumeChange) {
      onVolumeChange(trackId, newVolume);
    }
  };

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

  const handleSoloToggle = () => {
    if (onSoloToggle) {
      onSoloToggle(trackId, !isSolo);
    }
  };

  const cardClass = [
    'track-control-card',
    isMuted && 'track-muted',
    isSolo && 'track-solo',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="track-control-header">
        <h4 className="track-name" title={trackName}>
          {trackName}
        </h4>
      </div>
      
      <div className="track-control-body">
        <VolumeSlider
          value={volume}
          onChange={handleVolumeChange}
          disabled={isMuted}
          orientation="vertical"
          showValue={true}
        />
        
        <div className="track-control-options">
          <PanControl
            value={panValue}
            onChange={handlePanChange}
            disabled={isMuted}
          />
          
          <div className="track-control-buttons">
            <Button
              size="small"
              variant={isSolo ? 'warning' : 'ghost'}
              onClick={handleSoloToggle}
              className="solo-button"
              title="Solo track"
            >
              SOLO
            </Button>
            
            <Button
              size="small"
              variant={isMuted ? 'danger' : 'ghost'}
              onClick={handleMuteToggle}
              className="mute-button"
              title="Mute track"
            >
              MUTE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackControlCard;