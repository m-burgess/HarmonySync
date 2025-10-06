import React, { useState, useEffect } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';

const ConfidenceMonitor = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentSlide, setCurrentSlide] = useState(null);
  const [nextSlide, setNextSlide] = useState(null);
  const [isImageDisplay, setIsImageDisplay] = useState(false);

  // Clock functionality
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = String(hours % 12 || 12);
      setCurrentTime(`${displayHours}:${minutes} ${ampm}`);
    };

    updateClock(); // Initial call
    const intervalId = setInterval(updateClock, 1000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  // Tauri event listeners
  useEffect(() => {
    const unlistenDisplay = TauriEvent.listen('display-confidence-slide', (event) => {
      console.log('Confidence: display-confidence-slide event received:', event.payload);
      const { current, next } = event.payload;
      setCurrentSlide(current);
      setNextSlide(next);
      setIsImageDisplay(current && current.type === 'image');
    });

    const unlistenClear = TauriEvent.listen('clear-confidence-display', () => {
      console.log('Confidence: clear-confidence-display event received');
      setCurrentSlide(null);
      setNextSlide(null);
      setIsImageDisplay(false);
    });

    return () => {
      unlistenDisplay.then(f => f());
      unlistenClear.then(f => f());
    };
  }, []);

  return (
    <div className="monitor-container">
      {isImageDisplay && currentSlide && currentSlide.type === 'image' && (
        <div id="confidence-image-display">
          <img
            src={TauriCore.convertFileSrc(currentSlide.path)}
            alt={currentSlide.name}
            className="confidence-slide-image"
          />
        </div>
      )}

      {!isImageDisplay && (currentSlide || nextSlide) && (
        <div className="text-columns-wrapper" style={{ display: 'flex' }}>
          <div id="current-slide-display" className="slide-column">
            {currentSlide && currentSlide.text ? currentSlide.text.map((line, index) => <div key={index}>{line}</div>) : ''}
          </div>
          <div id="next-slide-display" className="slide-column">
            {nextSlide && nextSlide.text ? nextSlide.text.map((line, index) => <div key={index}>{line}</div>) : ''}
          </div>
        </div>
      )}

      <div id="clock-display" style={{ display: 'block' }}>
        {currentTime}
      </div>
    </div>
  );
};

export default ConfidenceMonitor;
