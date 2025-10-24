import React, { useState, useEffect, useRef } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';
import { lyricTransitionManager } from '../../utils/lyrics';

const ConfidenceMonitor = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentSlide, setCurrentSlide] = useState(null);
  const [nextSlide, setNextSlide] = useState(null);
  const [isImageDisplay, setIsImageDisplay] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState(null);
  const currentSlideRef = React.useRef(currentSlide);
  const confidenceDisplayRef = useRef(null);

  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

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
    const unlistenDisplay = TauriEvent.listen('display-confidence-slide', async (event) => {
      console.log('Confidence: display-confidence-slide event received:', event.payload);
      const { current, next } = event.payload;
      
      // Handle smooth transition for current slide if it's lyrics or image
      if (current && (current.type === 'lyrics' || current.type === 'image') && confidenceDisplayRef.current) {
        const content = current.type === 'lyrics' 
          ? { type: 'lyrics', text: current.text }
          : { type: 'image', path: current.path, name: current.name };
        await lyricTransitionManager.transitionTo(content, confidenceDisplayRef.current);
      }
      
      setCurrentSlide(current);
      setNextSlide(next);
      setIsImageDisplay(current && current.type === 'image');
      if (current && current.type !== 'video') {
        setVideoCountdown(null);
      }
    });

    const unlistenClear = TauriEvent.listen('clear-confidence-display', async () => {
      console.log('Confidence: clear-confidence-display event received');
      
      // Smooth transition to clear confidence display
      if (confidenceDisplayRef.current) {
        await lyricTransitionManager.clear(confidenceDisplayRef.current);
      }
      
      setCurrentSlide(null);
      setNextSlide(null);
      setIsImageDisplay(false);
      setVideoCountdown(null);
    });

    const unlistenVideoProgress = TauriEvent.listen('video-progress', (event) => {
      console.log('Confidence: video-progress event received:', event.payload);
      console.log('Current slide:', currentSlideRef.current);
      const { currentTime, duration } = event.payload;
      if (duration) {
        const remainingTime = duration - currentTime;
        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60).toString().padStart(2, '0');
        setVideoCountdown(`${minutes}:${seconds}`);
      }
    });

    return () => {
      unlistenDisplay.then(f => f());
      unlistenClear.then(f => f());
      unlistenVideoProgress.then(f => f());
    };
  }, []);

  return (
    <div className={`monitor-container ${isImageDisplay ? 'image-mode' : 'text-mode'}`}>
      {/* Transition-enabled current slide display */}
      <div 
        id="confidence-transition-display"
        ref={confidenceDisplayRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          transition: 'opacity 200ms ease-in-out',
          fontSize: isImageDisplay ? 'inherit' : '24px',
          padding: '20px'
        }}
      />

      {/* Next slide display (no transitions, just text) */}
      {!isImageDisplay && nextSlide && nextSlide.text && (
        <div 
          id="next-slide-display" 
          className="slide-column"
          style={{ 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: '20px',
            padding: '20px',
            color: '#888'
          }}
        >
          <h4 style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px' }}>NEXT SLIDE:</h4>
          {nextSlide.text.map((line, index) => (
            <div key={index} style={{ margin: '5px 0' }}>{line}</div>
          ))}
        </div>
      )}

      <div 
        id="clock-display" 
        style={{ 
          position: isImageDisplay ? 'absolute' : 'relative',
          bottom: isImageDisplay ? '20px' : 'auto',
          right: isImageDisplay ? '20px' : 'auto',
          backgroundColor: isImageDisplay ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
          padding: isImageDisplay ? '10px' : '0',
          borderRadius: isImageDisplay ? '5px' : '0',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff',
          zIndex: 10
        }}
      >
        {currentTime}
      </div>
      
      {currentSlide && currentSlide.type === 'video' && videoCountdown && (
        <div 
          id="video-countdown-display" 
          style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'red', 
            fontSize: '72px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            zIndex: 20
          }}
        >
          {videoCountdown}
        </div>
      )}
    </div>
  );
};

export default ConfidenceMonitor;
