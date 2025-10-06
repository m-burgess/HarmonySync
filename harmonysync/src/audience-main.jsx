import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import AudienceScreen from './AudienceScreen.jsx';
import './audience.css'; // Import audience.css
import * as TauriCore from '@tauri-apps/api/core';

const AudienceApp = () => {
  const [dynamicBackgroundCss, setDynamicBackgroundCss] = useState('');

  useEffect(() => {
    const fetchBackgroundCss = async () => {
      try {
        // Assuming the path for background.css generation is the current directory for the audience screen
        // This might need to be adjusted based on how the path is determined in the Rust backend
        const backgroundCssContent = await TauriCore.invoke('generate_background_css', { path: '.' });
        setDynamicBackgroundCss(backgroundCssContent);
      } catch (error) {
        console.error('Error generating background CSS for audience screen:', error);
      }
    };

    fetchBackgroundCss();
  }, []); // Run once on component mount

  return (
    <>
      {dynamicBackgroundCss && <style>{dynamicBackgroundCss}</style>}
      <AudienceScreen />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AudienceApp />
  </React.StrictMode>,
);