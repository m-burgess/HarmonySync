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
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
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
    const unlistenLyrics = event.listen('display-confidence-lyrics', (e: any) => {
      console.log('Confidence: display-confidence-lyrics event received:', e.payload);
      const { current, next } = e.payload;

      // Update state directly with simple content
      // current and next are string[]
      const currentContent: LyricsContent = { type: 'lyrics', text: current || [] };
      const nextContent: LyricsContent = { type: 'lyrics', text: next || [] };

      setCurrentSlide(currentContent);
      setNextSlide(nextContent);
      setIsImageDisplay(false);
      setVideoCountdown(null);
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

    // Timer visibility control events
    const unlistenTimerEnable = event.listen('confidence-timer-enable', () => {
      console.log('Confidence: timer enabled for display');
      setTimerEnabled(true);
    });

    const unlistenTimerDisable = event.listen('confidence-timer-disable', () => {
      console.log('Confidence: timer disabled for display');
      setTimerEnabled(false);
    });

    return () => {
      unlistenLyrics();
      unlistenClear();
      unlistenVideoProgress();
      unlistenTimerStart();
      unlistenTimerUpdate();
      unlistenTimerStop();
      unlistenTimerEnable();
      unlistenTimerDisable();
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
        {/* Always render lyrics container but toggle visibility to preserve transitions */}
        <div
          className="lyrics-display"
          style={{
            display: isLyricsMode ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <div className="current-lyrics" ref={confidenceDisplayRef}>
            {isLyricsMode && currentSlide && (currentSlide as any).text && (
              <div className="lyrics-content" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
              }}>
                {Array.isArray((currentSlide as any).text) && (currentSlide as any).text.map((line: string, i: number) => (
                  <div key={i} className="lyric-line" style={{
                    fontSize: 'min(5vw, 8vh)', // Slightly smaller than audience
                    fontWeight: 'bold',
                    margin: '0.2em 0',
                    textAlign: 'center',
                    color: '#ffff00' // Yellow for high visibility
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {/* Image Mode: Display full image */}
        {isImageDisplay && !isLyricsMode && currentSlide && (currentSlide as any).path && (
          <div className="image-display" ref={confidenceDisplayRef}>
            <img
              src={(currentSlide as any).path}
              alt={(currentSlide as any).name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Video Mode: Display countdown large in center */}
        {isVideoMode && videoCountdown && (
          <div className="video-countdown-large">
            {videoCountdown}
          </div>
        )}

        {/* Default/Empty State */}
        {!isLyricsMode && !isImageDisplay && !isVideoMode && (
          <div ref={confidenceDisplayRef} />
        )}
      </div>

      {/* Floating Timer at Bottom - Only shows when enabled, active AND not in lyrics mode */}
      {timerDisplay && timerEnabled && !isLyricsMode && (
        <div className={`floating-timer ${timerDisplay.colorClass}`}>
          <div className="timer-content">{timerDisplay.time}</div>
        </div>
      )}
    </div>
  );
};

export default ConfidenceMonitor;
