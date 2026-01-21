import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/style.css';

// Wait for electronAPI to be available (preload script must run first)
async function main() {
  console.log('[main.jsx] Starting main...');
  
  // Check if we're in Electron environment
  if (typeof window !== 'undefined') {
    // Wait for electronAPI with timeout (longer timeout for first boot)
    let attempts = 0;
    const maxAttempts = 80; // 8 seconds total
    while (typeof window.electronAPI === 'undefined' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    
    if (typeof window.electronAPI !== 'undefined') {
      console.log('[main.jsx] electronAPI is available after', attempts * 100, 'ms');
      
      // CRITICAL: Store the API reference on window so it survives Vite hot reloads
      // The preload script may not re-execute on HMR, so cache it now
      if (!window.__electronAPICached) {
        window.__electronAPICached = window.electronAPI;
        console.log('[main.jsx] Cached electronAPI globally');
      }
    } else {
      console.warn('[main.jsx] electronAPI was not available after 8 seconds');
    }
  }
  
  console.log('[main.jsx] Rendering App component...');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('[main.jsx] App rendered');
}

main().catch(err => console.error('[main.jsx] Error in main():', err));

