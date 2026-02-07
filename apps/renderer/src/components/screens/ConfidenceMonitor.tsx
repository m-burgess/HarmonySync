import React, { useState, useEffect, useRef } from 'react';
import { event } from '../../electron-adapter';
import { lyricTransitionManager } from '../../utils/lyrics';

type LyricsContent = { type: 'lyrics'; text: string[] };
type ImageContent = { type: 'image'; path?: string; name?: string };
type VideoContent = { type: 'video'; path?: string; duration?: number };
type SlideContent = LyricsContent | ImageContent | VideoContent | ({ type?: string } & Record<string, any>);

const ConfidenceMonitor = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState<SlideContent | null>(null);
  const [nextSlide, setNextSlide] = useState<SlideContent | null>(null);
  const [isImageDisplay, setIsImageDisplay] = useState<boolean>(false);
  const [videoCountdown, setVideoCountdown] = useState<string | null>(null);
  const currentSlideRef = React.useRef<SlideContent | null>(currentSlide);
  const confidenceDisplayRef = useRef<HTMLDivElement | null>(null);

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

  // Event listeners for slide display
  useEffect(() => {
    const unlistenDisplay = event.listen('display-confidence-slide', async (e: any) => {
      console.log('Confidence: display-confidence-slide event received:', e.payload);
      const { current, next } = e.payload;
      
      // Handle smooth transition for current slide if it's lyrics or image
      if (current && confidenceDisplayRef.current) {
        if (current.type === 'lyrics') {
          const content: LyricsContent = { type: 'lyrics', text: (current as any).text || [] };
          await lyricTransitionManager.transitionTo(content as any, confidenceDisplayRef.current);
        } else if (current.type === 'image') {
          const content: ImageContent = { type: 'image', path: (current as any).path, name: (current as any).name };
          await lyricTransitionManager.transitionTo(content as any, confidenceDisplayRef.current);
        }
      }
      
      setCurrentSlide(current);
      setNextSlide(next);
      setIsImageDisplay(current && current.type === 'image');
      if (current && current.type !== 'video') {
        setVideoCountdown(null);
      }
    });

    const unlistenClear = event.listen('clear-confidence-display', async () => {
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

    const unlistenVideoProgress = event.listen('video-progress', (e: any) => {
      console.log('Confidence: video-progress event received:', e.payload);
      console.log('Current slide:', currentSlideRef.current);
      const { currentTime, duration } = e.payload;
      if (duration) {
        const remainingTime = duration - currentTime;
        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60).toString().padStart(2, '0');
        setVideoCountdown(`${minutes}:${seconds}`);
      }
    });

    return () => {
      unlistenDisplay();
      unlistenClear();
      unlistenVideoProgress();
    };
  }, []);

  const isLyricsMode = currentSlide?.type === 'lyrics';

  return (
    <div className={`monitor-container ${isLyricsMode ? 'lyrics-mode' : 'media-mode'} ${isImageDisplay ? 'image-mode' : 'text-mode'}`}>
      <div className="monitor-top-bar">
        <div id="clock-display">{currentTime}</div>
      </div>

      <div className="monitor-content">
        <div 
          id="confidence-transition-display"
          ref={confidenceDisplayRef}
          style={{
            transition: 'opacity 200ms ease-in-out',
            fontSize: isImageDisplay ? 'inherit' : '24px'
          }}
        />

        {isLyricsMode && nextSlide && nextSlide.type === 'lyrics' && (
          <div id="next-slide-display">
            <h4>NEXT:</h4>
            {Array.isArray((nextSlide as LyricsContent).text) && (nextSlide as LyricsContent).text
              .slice(0, 2)
              .map((line: string, index: number) => (
                <div key={index}>{line}</div>
              ))}
          </div>
        )}
      </div>

      <div className="monitor-bottom-bar">
        <div id="video-countdown-display">{videoCountdown || ''}</div>
      </div>
    </div>
  );
};

export default ConfidenceMonitor;
