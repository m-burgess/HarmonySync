import React, { useState, useEffect, useRef } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';
import { lyricTransitionManager } from './lyric-transitions.js';

const AudienceScreen = () => {
  const [content, setContent] = useState(null); // { type: 'lyrics', text: [] }, { type: 'image', path: '', name: '' }, { type: 'video', videoId: '' }
  const playerRef = useRef(null);
  const lyricDisplayRef = useRef(null);

  // Initialize lyric display when component mounts
  useEffect(() => {
    if (lyricDisplayRef.current && !content) {
      lyricTransitionManager.displayImmediate(null, lyricDisplayRef.current);
    }
  }, []);

  // Initialize content when it first becomes available
  useEffect(() => {
    if (lyricDisplayRef.current && content && (content.type === 'lyrics' || content.type === 'image')) {
      lyricTransitionManager.displayImmediate(content, lyricDisplayRef.current);
    }
  }, [content]);

  // Add console log to verify component is loading
  console.log('AudienceScreen component loaded, content:', content);

  useEffect(() => {
    const unlistenBackground = TauriEvent.listen('set-background', (event) => {
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

    const unlistenLyric = TauriEvent.listen('display-lyric-slide', async (event) => {
      console.log('Audience: display-lyric-slide event received:', event.payload);
      const newContent = { type: 'lyrics', text: event.payload.text };
      
      // Use smooth transition for lyrics
      if (lyricDisplayRef.current) {
        await lyricTransitionManager.transitionTo(newContent, lyricDisplayRef.current);
      }
      setContent(newContent);
    });

    const unlistenImage = TauriEvent.listen('display-image-slide', async (event) => {
      console.log('Audience: display-image-slide event received:', event.payload);
      const newContent = { type: 'image', path: event.payload.path, name: event.payload.name };
      
      // Use smooth transition for images
      if (lyricDisplayRef.current) {
        await lyricTransitionManager.transitionTo(newContent, lyricDisplayRef.current);
      }
      setContent(newContent);
    });

    const unlistenClear = TauriEvent.listen('clear-lyric-display', async () => {
      console.log('Audience: clear-lyric-display event received');
      
      // Use smooth transition to clear display
      if (lyricDisplayRef.current) {
        await lyricTransitionManager.clear(lyricDisplayRef.current);
      }
      setContent(null);
    });

    const unlistenNavigate = TauriEvent.listen('navigate', (event) => {
      console.log('Audience: navigate event received:', event.payload);
      setContent({ type: 'video', videoId: event.payload.videoId });
    });

    if (content && content.type === 'video') {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      const onPlayerReady = (event) => {
        event.target.playVideo();
      };

      const onPlayerStateChange = (event) => {
        console.log('YouTube player state changed:', event.data);
        if (event.data === window.YT.PlayerState.PLAYING) {
          const intervalId = setInterval(() => {
            const currentTime = event.target.getCurrentTime();
            const duration = event.target.getDuration();
            TauriEvent.emit('video-progress', { currentTime, duration });

            if (duration - currentTime <= 3) {
              document.getElementById('youtube-player').classList.add('fade-out');
            } else {
              document.getElementById('youtube-player').classList.remove('fade-out');
            }
          }, 1000);
          playerRef.current.intervalId = intervalId;        } else if (event.data === window.YT.PlayerState.ENDED) {
          TauriEvent.emit('video-ended', 'YouTube video finished');
          document.getElementById('youtube-player').classList.remove('fade-out'); // Remove fade-out class
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

      if (window.YT && window.YT.Player) {
        setTimeout(createPlayer, 0);
      } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          setTimeout(createPlayer, 0);
        };
      }
    }

    return () => {
      unlistenBackground.then(f => f());
      unlistenLyric.then(f => f());
      unlistenImage.then(f => f());
      unlistenClear.then(f => f());
      unlistenNavigate.then(f => f());

      if (playerRef.current) {
        if (playerRef.current.intervalId) {
          clearInterval(playerRef.current.intervalId);
        }
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [content]);

  const renderContent = () => {
    console.log('AudienceScreen renderContent called, content:', content);
    
    if (!content) {
      return (
        <div 
          id="lyric-display" 
          ref={lyricDisplayRef}
          style={{ opacity: 0, display: 'none' }}
        />
      );
    }

    switch (content.type) {
      case 'lyrics':
      case 'image':
        return (
          <div 
            id="lyric-display" 
            ref={lyricDisplayRef}
            style={{ 
              opacity: 1, 
              display: 'flex',
              transition: 'opacity 200ms ease-in-out'
            }}
          />
        );
      case 'video':
        return (
          <>
            <div 
              id="lyric-display" 
              ref={lyricDisplayRef}
              style={{ opacity: 0, display: 'none' }}
            />
            <div id="youtube-player"></div>
          </>
        );
      default:
        return (
          <div 
            id="lyric-display" 
            ref={lyricDisplayRef}
            style={{ opacity: 0, display: 'none' }}
          />
        );
    }
  };

  return (
    <div id="audience-container">
      {renderContent()}
    </div>
  );
};

export default AudienceScreen;
