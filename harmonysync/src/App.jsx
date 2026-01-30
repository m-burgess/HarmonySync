/**
 * App Component - MVVM Refactored Root Component
 * 
 * This is the refactored root component using MVVM architecture:
 * - Uses ViewModels via DI container
 * - Wrapped with observer() for reactive state
 * - Minimal state management (only UI state like dialog visibility)
 * - Business logic delegated to ViewModels
 * - EventBus for cross-component communication
 * 
 * Key improvements:
 * - No props drilling (ViewModels accessed via DI)
 * - Cleaner separation of concerns
 * - Focus on layout and routing
 */
import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { core, event } from './electron-adapter';
import { 
  PresentationChartBarIcon, 
  CogIcon,
  SpeakerWaveIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  PlayIcon,
  CalendarIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';

import './styles/App.css';
import './styles/vscode-theme.css';
import { 
  ActivityBarIcon, 
  VSCodeStatusBar 
} from './components/VSCodeUI.tsx';
import ServiceOrderManager from './components/service-order/ServiceOrderManager.tsx';
import SlideManager from './components/slides/SlideManager';
import LyricsColumn from './components/lyrics/LyricsColumn.jsx';
import MultitrackPlayer from './components/audio/MultitrackPlayer';
import MixerSidebar from './components/audio/MixerSidebar';
import LyricsColumn from './components/lyrics/LyricsColumn.tsx';
import MultitrackPlayer from './components/audio/MultitrackPlayer.jsx';
import MixerSidebar from './components/audio/MixerSidebar.jsx';
import DisplaySettings from './components/screens/DisplaySettings.jsx';
import AudioSettings from './components/screens/AudioSettings.jsx';

import { getViewModel } from './viewmodels';
import { getService } from './services';
import { EVENT_TYPES } from './services/EventBusService.ts';

const App = observer(() => {
  // Get ViewModels from DI container
  const serviceOrderViewModel = getViewModel('serviceOrderViewModel');
  const slideViewModel = getViewModel('slideViewModel');
  const audioViewModel = getViewModel('audioViewModel');
  const eventBusService = getService('eventBusService');

  // UI-only state (not business logic)
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const containerRef = useRef(null);

  // Resizable layout state
  const DEFAULT_SIDEBAR_WIDTH = 300;
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const v = parseInt(localStorage.getItem('rp_sidebarWidth'), 10);
    return isNaN(v) ? DEFAULT_SIDEBAR_WIDTH : v;
  });
  
  const draggingRef = useRef(null);
  const rafRef = useRef(null);

  // Listen to EventBus for cross-component events
  useEffect(() => {
    // Subscribe to tracks-updated event from transpose
    const unsubscribeTracks = eventBusService.subscribe(
      EVENT_TYPES.TRACKS_UPDATED,
      (payload) => {
        console.log('[App] Tracks updated via EventBus:', payload);
        // AudioViewModel handles this internally now
      }
    );

    // Subscribe to video-ended event
    const unsubscribeVideo = eventBusService.subscribe(
      EVENT_TYPES.VIDEO_ENDED,
      () => {
        console.log('[App] Video ended - advancing to next slide');
        // Simulate ArrowDown key press
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          which: 40,
          bubbles: true,
        }));
      }
    );

    return () => {
      unsubscribeTracks();
      unsubscribeVideo();
    };
  }, [eventBusService]);

  // Listen for legacy window events (to be migrated to EventBus)
  useEffect(() => {
    const unlisten = event.listen('tracks-updated', (evt) => {
      console.log('[App] Legacy tracks-updated event:', evt.payload);
      // Publish to EventBus for migration
      eventBusService.publish(EVENT_TYPES.TRACKS_UPDATED, evt.payload);
    });

    return unlisten;
  }, [eventBusService]);

  useEffect(() => {
    const unlisten = event.listen('video-ended', () => {
      // Publish to EventBus
      eventBusService.publish(EVENT_TYPES.VIDEO_ENDED);
    });

    return unlisten;
  }, [eventBusService]);

  // Window resize cleanup
  useEffect(() => {
    const handleUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // VS Code style sidebar resizing
  const startSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const startWidth = sidebarWidth;
    
    draggingRef.current = { type: 'sidebar', startX, startWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const onMove = (ev) => {
      if (!draggingRef.current || draggingRef.current.type !== 'sidebar') return;
      const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
      const { startX, startWidth } = draggingRef.current;
      const dx = clientX - startX;
      const minWidth = 200;
      const maxWidth = 600;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        let newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
        setSidebarWidth(newWidth);
        localStorage.setItem('rp_sidebarWidth', String(newWidth));
      });
    };

    const onUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  const resetSidebar = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    localStorage.removeItem('rp_sidebarWidth');
  };

  // Listen for display settings menu event
  useEffect(() => {
    const unlisten = event.listen('display-settings-clicked', () => {
      setIsDisplaySettingsOpen(true);
    });

    return unlisten;
  }, []);

  // Listen for audio settings menu event
  useEffect(() => {
    const unlisten = event.listen('audio-settings-clicked', () => {
      setIsAudioSettingsOpen(true);
    });

    return unlisten;
  }, []);

  // Listen for preservice music events from scheduler
  useEffect(() => {
    const unlistenStart = event.listen('start-preservice-music', async () => {
      try {
        await core.invoke('open_preservice_music_window');
      } catch (error) {
        console.error('Failed to open pre-service music window:', error);
      }
    });

    const unlistenStop = event.listen('stop-preservice-music', async () => {
      try {
        await core.invoke('close_preservice_music_window');
      } catch (error) {
        console.error('Failed to close pre-service music window:', error);
      }
    });

    return () => {
      unlistenStart();
      unlistenStop();
    };
  }, []);

  // Callbacks for child components (temporary - will be removed when all components are refactored)
  const handleSetAllSlides = (slides) => {
    slideViewModel.setSlides(slides);
  };

  const handleSetAllTracks = (tracks) => {
    audioViewModel.setTracks(tracks);
  };

  const handleSetIsLoadingTracks = (isLoading) => {
    audioViewModel.setIsLoading(isLoading);
  };

  const handleSetCurrentLyrics = (lyrics) => {
    serviceOrderViewModel.setSelectedSongForLyrics(lyrics);
  };

  const handleSetSelectedSlide = (slide) => {
    slideViewModel.setSelectedSlide(slide);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-300 vscode-ui-font flex" ref={containerRef}>
      {/* VS Code Activity Bar */}
      <div className="vscode-activity-bar">
        <ActivityBarIcon 
          icon={<PresentationChartBarIcon className="w-8 h-8" />} 
          label="Service Order" 
          active={true}
        />
        <ActivityBarIcon 
          icon={<CalendarIcon className="w-8 h-8" />} 
          label="Scheduler" 
          onClick={async () => {
            try {
              await core.invoke('open_scheduler_window');
            } catch (error) {
              console.error('Failed to open scheduler window:', error);
            }
          }}
        />
        <ActivityBarIcon 
          icon={<PlayIcon className="w-8 h-8" />} 
          label="Pre-Service Music" 
          onClick={async () => {
            try {
              await core.invoke('open_preservice_music_window');
            } catch (error) {
              console.error('Failed to open pre-service music window:', error);
            }
          }}
        />

        <ActivityBarIcon 
          icon={<MusicalNoteIcon className="w-8 h-8" />} 
          label="Audio/MIDI Settings" 
          onClick={() => setIsAudioSettingsOpen(true)}
        />

        <ActivityBarIcon 
          icon={<CogIcon className="w-8 h-8" />} 
          label="Settings" 
          onClick={() => setIsDisplaySettingsOpen(true)}
        />
      </div>

      {/* Main Layout: Service Order Sidebar + Slide Editor */}
      <div className="flex-1 flex">
        {/* Service Order Sidebar */}
        <div 
          className="vscode-sidebar bg-gray-800 border-r border-gray-700"
          style={{ width: `${sidebarWidth}px` }}
        >
          <ServiceOrderManager 
            setAllSlides={handleSetAllSlides} 
            setAllTracks={handleSetAllTracks} 
            setIsLoadingTracks={handleSetIsLoadingTracks}
            setCurrentLyrics={handleSetCurrentLyrics}
          />
        </div>

        {/* VS Code Resize Handle for Sidebar */}
        <div
          className="vscode-resize-handle-vertical"
          onMouseDown={startSidebarResize}
          onDoubleClick={resetSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex bg-gray-900">
          {/* Slide Editor or Lyrics Column */}
          <div className="flex-1 overflow-hidden">
            {serviceOrderViewModel.selectedSongForLyrics ? (
              <LyricsColumn lyrics={serviceOrderViewModel.selectedSongForLyrics} />
            ) : (
              <SlideManager 
                allSlides={slideViewModel.slides} 
                setAllSlides={handleSetAllSlides} 
                selectedSlide={slideViewModel.selectedSlide} 
                setSelectedSlide={handleSetSelectedSlide} 
              />
            )}
          </div>

          {/* Mixer Sidebar */}
          <MixerSidebar 
            allTracks={audioViewModel.tracks} 
            isLoadingTracks={audioViewModel.isLoading} 
          />
        </div>
      </div>

      <DisplaySettings
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
      />

      <AudioSettings
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />
    </div>
  );
});

export default App;
