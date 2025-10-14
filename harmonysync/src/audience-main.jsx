import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import AudienceScreen from './AudienceScreen.jsx';
import './audience.css'; // Import audience.css
import './lyric-transitions.css'; // Import transition effects
import * as TauriCore from '@tauri-apps/api/core';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriPath from '@tauri-apps/api/path'; // Add this import

const AudienceApp = () => {
  const [dynamicBackgroundCss, setDynamicBackgroundCss] = useState('');
  const videoRef = useRef(null); // Create a ref for the video element
  const httpServerUrl = useRef(null); // Ref to store the HTTP server URL

  console.log('AudienceApp component loading...');

      const handleVideoEnded = () => {
        if (videoRef.current) {
          videoRef.current.style.display = 'none'; // Hide the video
          videoRef.current.classList.remove('fade-out'); // Remove fade-out class
          TauriEvent.emit('video-ended', 'Audience video finished');
        }
      };
          const handleVideoTimeUpdate = () => {
            if (videoRef.current) {
              const { currentTime, duration } = videoRef.current;
              TauriEvent.emit('video-progress', { currentTime, duration });
      
              if (duration - currentTime <= 3) {
                videoRef.current.classList.add('fade-out');
              } else {
                videoRef.current.classList.remove('fade-out');
              }
            }
          };  useEffect(() => {
    // Start the custom HTTP server
    const startServer = async () => {
      try {
        // Use a fixed port or dynamically find one
        const port = 3001; // Example port
        const url = await TauriCore.invoke('start_http_server', { port });
        httpServerUrl.current = url;
        console.log('Custom HTTP server started at:', url);
      } catch (error) {
        console.error('Error starting custom HTTP server:', error);
      }
    };
    startServer();







    // Listen for the display-video-slide event
    const unlisten = TauriEvent.listen('display-video-slide', async (event) => {
      const videoPath = event.payload; // This is the absolute path to the video file
      console.log('Audience Screen: Received display-video-slide event with path:', videoPath);

      if (videoRef.current && httpServerUrl.current) {
        try {
          const fileName = await TauriPath.basename(videoPath); // Get just the filename
          const videoUrl = `${httpServerUrl.current}/${fileName}`;

          console.log('Audience Screen: Video URL from custom HTTP server:', videoUrl);
          videoRef.current.src = videoUrl;
          videoRef.current.style.display = 'block'; // Show the video

          // Remove existing listeners to avoid duplicates
          videoRef.current.removeEventListener('ended', handleVideoEnded);
          videoRef.current.removeEventListener('timeupdate', handleVideoTimeUpdate);

          // Add new listeners
          videoRef.current.addEventListener('ended', handleVideoEnded);
          videoRef.current.addEventListener('timeupdate', handleVideoTimeUpdate);

          videoRef.current.play().then(() => {
            console.log('Audience Screen: Video started playing.');
          }).catch(e => console.error("Audience Screen: Error playing video:", e));
        } catch (error) {
          console.error('Audience Screen: Error getting video URL or playing video:', error);
        }
      } else {
        console.error('Audience Screen: Video element or HTTP server not ready!');
      }
    });

    return () => {
      unlisten.then(f => f()); // Clean up the event listener
      if (videoRef.current) {
        videoRef.current.removeEventListener('ended', handleVideoEnded);
        videoRef.current.removeEventListener('timeupdate', handleVideoTimeUpdate);
      }
      // Stop the HTTP server when component unmounts
      TauriCore.invoke('stop_http_server').catch(e => console.error('Error stopping HTTP server:', e));
    };
  }, []); // Run once on component mount

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: 'black' }}>
      {dynamicBackgroundCss && <style>{dynamicBackgroundCss}</style>}
      <video id="audience-video" ref={videoRef} autoPlay muted playsInline type="video/mp4" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'none' }}></video> {/* Removed controls, added autoPlay, muted, playsInline */}
      <AudienceScreen />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <AudienceApp />
);