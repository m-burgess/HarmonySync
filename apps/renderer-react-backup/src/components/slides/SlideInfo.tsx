import React from 'react';
import { VSCodePanel } from '../VSCodeUI.tsx';
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
          <VSCodePanel title="Lyrics" className="slide-info-panel">
            <p className="slide-info-text">{selectedSlide.text.join('\n')}</p>
          </VSCodePanel>
        );
      case 'video':
        return (
          <VSCodePanel title="Video" className="slide-info-panel">
            <p className="slide-info-text">Countdown: {selectedSlide.duration}s</p>
          </VSCodePanel>
        );
      case 'youtube':
        return (
          <VSCodePanel title="YouTube" className="slide-info-panel">
            <p className="slide-info-text">Video ID: {selectedSlide.videoId}</p>
          </VSCodePanel>
        );
      case 'image':
        return (
          <VSCodePanel title="Image" className="slide-info-panel">
            <p className="slide-info-text">{selectedSlide.name}</p>
          </VSCodePanel>
        );
      default:
        return null;
    }
  };

  return <div className="slide-info">{renderSlideInfo()}</div>;
};

export default SlideInfo;
