import React, { useState, useEffect, useRef } from 'react';
import { event } from '../../electron-adapter';
import { lyricTransitionManager } from '../../utils/lyrics';

type LyricsContent = { type: 'lyrics'; text: string[] };
type ImageContent = { type: 'image'; path?: string; name?: string };
type VideoContent = { type: 'video'; path?: string; duration?: number };
type SlideContent = LyricsContent | ImageContent | VideoContent | ({ type?: string } & Record<string, any>);

interface TimerState {
  active: boolean;
  elapsed: number;
  total: number;
}

const ConfidenceMonitor = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState<SlideContent | null>(null);
  const [nextSlide, setNextSlide] = useState<SlideContent | null>(null);
  const [isImageDisplay, setIsImageDisplay] = useState<boolean>(false);
  const [videoCountdown, setVideoCountdown] = useState<string | null>(null);
  const [timer, setTimer] = useState<TimerState>({ active: false, elapsed: 0, total: 0 });
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

    // Timer events
    const unlistenTimerStart = event.listen('timer-started', (e: any) => {
      console.log('Confidence: timer-started event received:', e.payload);
      const { total } = e.payload;
      setTimer({ active: true, elapsed: 0, total });
    });

    const unlistenTimerUpdate = event.listen('timer-update', (e: any) => {
      const { elapsed, total } = e.payload;
      setTimer({ active: true, elapsed, total });
    });

    const unlistenTimerStop = event.listen('timer-stopped', () => {
      console.log('Confidence: timer-stopped event received');
      setTimer({ active: false, elapsed: 0, total: 0 });
    });

    return () => {
      unlistenDisplay();
      unlistenClear();
      unlistenVideoProgress();
      unlistenTimerStart();
      unlistenTimerUpdate();
      unlistenTimerStop();
    };
  }, []);

  const isLyricsMode = currentSlide?.type === 'lyrics';
  const isVideoMode = currentSlide?.type === 'video';

  // Calculate timer display values
  const getTimerDisplay = () => {
    if (!timer.active || timer.total === 0) return null;
    
    const remaining = Math.max(0, timer.total - timer.elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = (remaining % 60).toString().padStart(2, '0');
    const percentage = (timer.elapsed / timer.total) * 100;
    
    let colorClass = '';
    if (percentage >= 90) {
      colorClass = 'timer-critical';
    } else if (percentage >= 75) {
      colorClass = 'timer-warning';
    }
    
    return { time: `${minutes}:${seconds}`, colorClass };
  };

  const timerDisplay = getTimerDisplay();

  return (
    <div className="monitor-container">
      {/* Floating Clock at Top Center */}
      <div className="floating-clock">
        <div className="clock-content">{currentTime}</div>
      </div>

      {/* Main Content Area - Black Background, Single Column */}
      <div className="monitor-main-content">
        {/* Lyrics Mode: Display current and next lyrics */}
        {isLyricsMode && (
          <div className="lyrics-display">
            <div 
              className="current-lyrics"
              ref={confidenceDisplayRef}
              style={{
                transition: 'opacity 200ms ease-in-out',
              }}
            />
            {nextSlide && nextSlide.type === 'lyrics' && (
              <div className="next-lyrics">
                <h4>NEXT:</h4>
                <div className="next-lyrics-text">
                  {Array.isArray((nextSlide as LyricsContent).text) && (nextSlide as LyricsContent).text
                    .slice(0, 2)
                    .map((line: string, index: number) => (
                      <div key={index}>{line}</div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Mode: Display full image */}
        {isImageDisplay && !isLyricsMode && (
          <div 
            className="image-display"
            ref={confidenceDisplayRef}
            style={{
              transition: 'opacity 200ms ease-in-out',
            }}
          />
        )}

        {/* Video Mode: Display countdown large in center */}
        {isVideoMode && videoCountdown && (
          <div className="video-countdown-large">
            {videoCountdown}
          </div>
        )}

        {/* Default/Empty State */}
        {!isLyricsMode && !isImageDisplay && !isVideoMode && (
          <div 
            ref={confidenceDisplayRef}
            style={{
              transition: 'opacity 200ms ease-in-out',
            }}
          />
        )}
      </div>

      {/* Floating Timer at Bottom - Only shows when active */}
      {timerDisplay && (
        <div className={`floating-timer ${timerDisplay.colorClass}`}>
          <div className="timer-content">{timerDisplay.time}</div>
        </div>
      )}
    </div>
  );
};

export default ConfidenceMonitor;
