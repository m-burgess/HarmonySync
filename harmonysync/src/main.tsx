import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/style.css';

// Import MVVM infrastructure
import { setupServices } from './services/index.ts';
import { setupViewModels } from './viewmodels/index.ts';

// Wait for electronAPI to be available (preload script must run first)
async function main() {
  console.log('[main.jsx] Starting main...');
  
  // Check if we're in Electron environment
  if (typeof window !== 'undefined') {
    // Wait for electronAPI with timeout (longer timeout for first boot)
    let attempts = 0;
    const maxAttempts = 80; // 8 seconds total
    
    while (attempts < maxAttempts) {
      // Check if preload is ready
      if (window.__preloadReady && typeof window.electronAPI !== 'undefined') {
        console.log('[main.jsx] electronAPI is available after', attempts * 100, 'ms');
        break;
      }
      
      // Also check for cached API (HMR recovery)
      if (typeof window.__electronAPICached !== 'undefined' && !window.electronAPI) {
        console.log('[main.jsx] Recovering electronAPI from cache');
        window.electronAPI = window.__electronAPICached;
        break;
      }
      
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    
    if (typeof window.electronAPI !== 'undefined') {
      console.log('[main.jsx] ✅ electronAPI successfully loaded');
      
      // CRITICAL: Store the API reference in multiple permanent caches
      // This ensures it survives Vite HMR and module reloads
      if (!window.__electronAPICached) {
        window.__electronAPICached = window.electronAPI;
        console.log('[main.jsx] Cached electronAPI globally');
      }
      
      // SUPER CRITICAL: Create a permanent cache that absolutely won't be cleared
      if (!window.__electronAPI_PERMANENT_CACHE) {
        window.__electronAPI_PERMANENT_CACHE = window.electronAPI;
        console.log('[main.jsx] Created permanent electronAPI cache');
      }
      
      // Also store in globalThis if available
      if (typeof globalThis !== 'undefined' && !globalThis.__electronAPI_PERMANENT_CACHE) {
        globalThis.__electronAPI_PERMANENT_CACHE = window.electronAPI;
        console.log('[main.jsx] Stored in globalThis permanent cache');
      }

      // Initialize MVVM architecture
      console.log('[main.jsx] Setting up MVVM services and ViewModels...');
      try {
        setupServices();
        setupViewModels();
        console.log('[main.jsx] ✅ MVVM architecture initialized successfully');
      } catch (error) {
        console.error('[main.jsx] ❌ Failed to initialize MVVM architecture:', error);
      }
    } else {
      console.error('[main.jsx] ❌ electronAPI was not available after 8 seconds');
      console.error('[main.jsx] __preloadReady:', window.__preloadReady);
      console.error('[main.jsx] __electronAPICached:', typeof window.__electronAPICached);
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

