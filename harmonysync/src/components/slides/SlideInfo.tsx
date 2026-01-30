import React from 'react';
import type { SlideData } from './types';

interface SlideInfoProps {
  selectedSlide: SlideData | null;
}

const SlideInfo: React.FC<SlideInfoProps> = ({ selectedSlide }) => {
  if (!selectedSlide) {
    return <div className="slide-info"></div>;
  }

  const renderSlideInfo = () => {
    switch (selectedSlide.type) {
      case 'lyric':
        return (
          <div>
            <h4>Lyrics</h4>
            <p>{selectedSlide.text.join('\n')}</p>
          </div>
        );
      case 'video':
        return (
          <div>
            <h4>Video</h4>
            <p>Countdown: {selectedSlide.duration}s</p>
          </div>
        );
      case 'youtube':
        return (
          <div>
            <h4>YouTube</h4>
            <p>Video ID: {selectedSlide.videoId}</p>
          </div>
        );
      case 'image':
        return (
          <div>
            <h4>Image</h4>
            <p>{selectedSlide.name}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="slide-info">{renderSlideInfo()}</div>;
};

export default SlideInfo;
