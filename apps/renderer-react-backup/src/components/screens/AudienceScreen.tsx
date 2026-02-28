import React, { useState, useEffect, useRef } from 'react';
import { event } from '../../electron-adapter';

interface LyricContent {
  type: 'lyrics';
  text: string[];
}

interface ImageContent {
  type: 'image';
  path: string;
  name: string;
}

interface VideoContent {
  type: 'video';
  videoId: string;
}

type Content = LyricContent | ImageContent | VideoContent | null;

const AudienceScreen: React.FC = () => {
  const [content, setContent] = useState<Content>(null);
  const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null);
  const playerRef = useRef<any | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);

  // Add console log to verify component is loading
  console.log('AudienceScreen component loaded, content:', content);

  useEffect(() => {
    const unlistenBackground = event.listen('set-background', (event: any) => {
      console.log('Audience: set-background event received:', event.payload);
      const head = document.getElementsByTagName('head')[0];
      let oldStyle = document.getElementById('song-background-style');
      if (oldStyle) {
        head.removeChild(oldStyle);
      }

      const style = document.createElement('style');
      style.id = 'song-background-style';
      style.textContent = event.payload;
      head.appendChild(style);
    });

    const unlistenLyric = event.listen('display-lyrics', (event: any) => {
      console.log('Audience: display-lyrics event received:', event.payload);
      const newContent: LyricContent = { type: 'lyrics', text: event.payload.lines };
      setContent(newContent);
    });

    const unlistenImage = event.listen('display-image-slide', (event: any) => {
      console.log('Audience: display-image-slide event received:', event.payload);
      const newContent: ImageContent = { type: 'image', path: event.payload.path, name: event.payload.name };
      setContent(newContent);
    });

    const unlistenClear = event.listen('clear-lyric-display', () => {
      console.log('Audience: clear-lyric-display event received');
      setContent(null);
    });

    const unlistenNavigate = event.listen('navigate', (event: any) => {
      console.log('Audience: navigate event received:', event.payload);
      setContent({ type: 'video', videoId: event.payload.videoId });
    });

    const unlistenStartBackgroundVideo = event.listen('start-background-video', (event: any) => {
      console.log('Audience: start-background-video event received:', event.payload);
      setBackgroundVideo(event.payload.path);
    });

    const unlistenStopBackgroundVideo = event.listen('stop-background-video', () => {
      console.log('Audience: stop-background-video event received');
      setBackgroundVideo(null);
    });

    if (content && content.type === 'video') {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }

      const onPlayerReady = (event: any) => {
        event.target.playVideo();
      };

      const onPlayerStateChange = (event: any) => {
        console.log('YouTube player state changed:', event.data);
        if (event.data === window.YT.PlayerState.PLAYING) {
          const intervalId = setInterval(() => {
            const currentTime = event.target.getCurrentTime();
            const duration = event.target.getDuration();
            event.emit('video-progress', { currentTime, duration });

            const el = document.getElementById('youtube-player');
            if (duration - currentTime <= 3) {
              el?.classList.add('fade-out');
            } else {
              el?.classList.remove('fade-out');
            }
          }, 1000);
          playerRef.current.intervalId = intervalId;
        } else if (event.data === (window as any).YT.PlayerState.ENDED) {
          event.emit('video-ended', 'YouTube video finished');
          document.getElementById('youtube-player')?.classList.remove('fade-out'); // Remove fade-out class
        } else {
          // If the video is not playing, clear the interval
          if (playerRef.current && playerRef.current.intervalId) {
            clearInterval(playerRef.current.intervalId);
          }
        }
      };

      const createPlayer = () => {
        console.log('Creating YouTube player');
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: content.videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        });
      };

      if ((window as any).YT && (window as any).YT.Player) {
        setTimeout(createPlayer, 0);
      } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
          setTimeout(createPlayer, 0);
        };
      }
    }

    return () => {
      unlistenBackground();
      unlistenLyric();
      unlistenImage();
      unlistenClear();
      unlistenNavigate();
      unlistenStartBackgroundVideo();
      unlistenStopBackgroundVideo();

      if (playerRef.current) {
        if (playerRef.current.intervalId) {
          clearInterval(playerRef.current.intervalId as any);
        }
        if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [content]);

  const showLyrics = content && (content.type === 'lyrics' || content.type === 'image');
  const showVideo = content && content.type === 'video';

  return (
    <div id="audience-container" style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {backgroundVideo && (
        <video
          ref={backgroundVideoRef}
          className="background-video"
          src={backgroundVideo}
          autoPlay
          loop
          muted
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
            opacity: 0.6,
          }}
        />
      )}

      {/* Content Layer */}
      <div
        id="lyric-display"
        className="content-layer"
        style={{
          position: 'relative',  // Required for zIndex to work
          opacity: showLyrics ? 1 : 0,
          zIndex: 20,            // Ensure above video
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100vw',        // Force full viewport width
          height: '100vh',       // Force full viewport height
          textAlign: 'center',
          padding: '2rem',       // Add padding
          boxSizing: 'border-box',
          transition: 'opacity 200ms ease-in-out',
          overflow: 'hidden'     // Prevent scrollbars
        }}
      >
        {content?.type === 'lyrics' && (
          <>
            {(content as LyricContent).text.map((line, i) => (
              <div key={i} className="lyric-line" style={{
                fontSize: 'min(6vw, 10vh)', // Responsive font size based on viewport
                lineHeight: '1.2',
                fontWeight: 'bold',
                margin: '0.2em 0',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
                color: 'white'
              }}>
                {line}
              </div>
            ))}
          </>
        )}

        {content?.type === 'image' && (
          <img
            src={(content as ImageContent).path}
            alt={(content as ImageContent).name}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}
          />
        )}
      </div>

      {/* Video Player */}
      {showVideo && <div id="youtube-player"></div>}
    </div>
  );
};

export default AudienceScreen;
