import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import AudienceScreen from './components/screens/AudienceScreen.tsx';
import './styles/audience.css'; // Import audience.css
import './styles/lyric-transitions.css'; // Import transition effects
import { core, event } from './electron-adapter';

const AudienceApp = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null); // Create a ref for the video element
  const httpServerUrl = useRef<string | null>(null); // Ref to store the HTTP server URL

  console.log('AudienceApp component loading...');

  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.style.display = 'none'; // Hide the video
      videoRef.current.classList.remove('fade-out'); // Remove fade-out class
      event.emit('video-ended', 'Audience video finished');
    }
  };
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      event.emit('video-progress', { currentTime, duration });

      if (duration - currentTime <= 3) {
        videoRef.current.classList.add('fade-out');
      } else {
        videoRef.current.classList.remove('fade-out');
      }
    }
  }; useEffect(() => {
    // Start the custom HTTP server
    const startServer = async () => {
      try {
        const url = await core.invoke('start_http_server') as string;
        httpServerUrl.current = url;
        console.log('Custom HTTP server started at:', url);
      } catch (error) {
        console.error('Error starting custom HTTP server:', error);
        try {
          const existingUrl = await core.invoke('http:getServerUrl') as string;
          httpServerUrl.current = existingUrl;
          console.log('Using existing HTTP server at:', existingUrl);
        } catch (fallbackError) {
          console.error('Error getting existing HTTP server URL:', fallbackError);
        }
      }
    };
    startServer();







    const unlisten = event.listen('display-video-slide', async (event) => {
      const payload = event.payload as { path?: string; loop?: boolean } | string;
      const videoPath = typeof payload === 'string' ? payload : payload?.path;
      const shouldLoop = typeof payload === 'string' ? false : !!payload?.loop;
      console.log('Audience Screen: Received display-video-slide event with path:', videoPath, 'loop:', shouldLoop);

      if (videoRef.current && httpServerUrl.current && videoPath) {
        try {
          const encodedPath = encodeURIComponent(videoPath);
          const videoUrl = `${httpServerUrl.current}/video/${encodedPath}`;

          console.log('Audience Screen: Video URL from custom HTTP server:', videoUrl);
          videoRef.current.src = videoUrl;
          videoRef.current.loop = shouldLoop;
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
        console.error('Audience Screen: Video path, element, or HTTP server not ready!');
      }
    });

    return () => {
      unlisten(); // Clean up the event listener
      if (videoRef.current) {
        videoRef.current.removeEventListener('ended', handleVideoEnded);
        videoRef.current.removeEventListener('timeupdate', handleVideoTimeUpdate);
      }
      // Stop the HTTP server when component unmounts
      core.invoke('stop_http_server').catch(e => console.error('Error stopping HTTP server:', e));
    };
  }, []); // Run once on component mount

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: 'black', position: 'relative', overflow: 'hidden' }}>
      <video id="audience-video" ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'none', zIndex: 1 }}></video>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
        <AudienceScreen />
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <AudienceApp />
  );
}