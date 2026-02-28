import React from 'react';
import '../../styles/components/TrackControlCard.css';

interface TrackControlCardProps {
  trackId: string;
  trackName: string;
  isMuted?: boolean;
  onMuteToggle?: (trackId: string, newMuteState: boolean) => void;
  className?: string;
  isPreloaded?: boolean;
  preloadStatus?: 'pending' | 'loading' | 'ready' | 'error';
}

const TrackControlCard: React.FC<TrackControlCardProps> = ({
  trackId,
  trackName,
  isMuted = false,
  onMuteToggle,
  className = '',
  isPreloaded = false,
  preloadStatus = 'pending'
}) => {
  const handleMuteToggle = (): void => {
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
  
  // Create a more readable short name for the button
  const shortName = displayName.length > 20 
    ? displayName.substring(0, 18) + '...' 
    : displayName;

  // Determine preload icon and color
  const getPreloadIndicator = () => {
    switch (preloadStatus) {
      case 'ready':
        return { icon: '✓', color: 'text-green-500', title: 'Ready for playback' };
      case 'loading':
        return { icon: '⟳', color: 'text-yellow-500', title: 'Preparing track...' };
      case 'error':
        return { icon: '✗', color: 'text-red-500', title: 'Preload failed' };
      default:
        return { icon: '○', color: 'text-gray-500', title: 'Pending' };
    }
  };

  const preloadIndicator = getPreloadIndicator();

  return (
    <div className={cardClass}>
      <button 
        className={`track-name-button ${isMuted ? 'muted' : ''}`}
        onClick={handleMuteToggle}
        title={`${displayName}\n\nClick to ${isMuted ? 'unmute' : 'mute'} this track\n${preloadIndicator.title}`}
      >
        <span className={`text-sm font-medium mr-1 ${preloadIndicator.color}`} title={preloadIndicator.title}>
          {preloadIndicator.icon}
        </span>
        {isMuted ? (
          <span className="track-status-icon muted-icon">🔇</span>
        ) : (
          <span className="track-status-icon active-icon">🔊</span>
        )}
        <span className="track-display-name">{shortName}</span>
      </button>
    </div>
  );
};

export default TrackControlCard;
