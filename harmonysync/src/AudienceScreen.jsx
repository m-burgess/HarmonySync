import React, { useState, useEffect } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';

const AudienceScreen = () => {
  const [content, setContent] = useState(null); // { type: 'lyrics', text: [] }, { type: 'image', path: '', name: '' }, { type: 'video', videoId: '' }

  useEffect(() => {
    // Handle set-background event
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

    // Handle display-lyric-slide event
    const unlistenLyric = TauriEvent.listen('display-lyric-slide', (event) => {
      console.log('Audience: display-lyric-slide event received:', event.payload);
      setContent({ type: 'lyrics', text: event.payload.text });
    });

    // Handle display-image-slide event
    const unlistenImage = TauriEvent.listen('display-image-slide', (event) => {
      console.log('Audience: display-image-slide event received:', event.payload);
      setContent({ type: 'image', path: event.payload.path, name: event.payload.name });
    });

    // Handle clear-lyric-display event
    const unlistenClear = TauriEvent.listen('clear-lyric-display', () => {
      console.log('Audience: clear-lyric-display event received');
      setContent(null);
    });

    // Handle navigate event (YouTube video)
    const unlistenNavigate = TauriEvent.listen('navigate', (event) => {
      console.log('Audience: navigate event received:', event.payload);
      setContent({ type: 'video', videoId: event.payload.videoId });
    });

    return () => {
      unlistenBackground.then(f => f());
      unlistenLyric.then(f => f());
      unlistenImage.then(f => f());
      unlistenClear.then(f => f());
      unlistenNavigate.then(f => f());
    };
  }, []);

  const renderContent = () => {
    if (!content) {
      return null;
    }

    switch (content.type) {
      case 'lyrics':
        return (
          <div id="lyric-display">
            {content.text.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        );
      case 'image':
        return (
          <div id="lyric-display">
            <img
              src={TauriCore.convertFileSrc(content.path)}
              alt={content.name}
              className="audience-slide-image"
            />
          </div>
        );
      case 'video':
        return (
          <div id="lyric-display">
            <iframe
              src={`https://www.youtube.com/embed/${content.videoId}?autoplay=1`}
              width="100%"
              height="100%"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default AudienceScreen;
