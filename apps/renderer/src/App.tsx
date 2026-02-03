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
import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { core, event } from './electron-adapter';
import { 
  PresentationChartBarIcon, 
  CogIcon,
  AdjustmentsHorizontalIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';

import './styles/App.css';
import './styles/vscode-theme.css';
import { 
  ActivityBarIcon
} from './components/VSCodeUI.tsx';
import ServiceOrderManager from './components/service-order/ServiceOrderManager.tsx';
import SlideManager from './components/slides/SlideManager.tsx';
import LyricsColumn from './components/lyrics/LyricsColumn.tsx';
import MixerSidebar from './components/audio/MixerSidebar.tsx';
import DisplaySettings from './components/screens/DisplaySettings.tsx';
import AudioSettings from './components/screens/AudioSettings.tsx';
import ServiceOrderSettings from './components/screens/ServiceOrderSettings.tsx';
import Modal from './components/ui/Modal.tsx';
import ServiceOrderImportDialog from './components/modals/ServiceOrderImportDialog.tsx';

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
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [serviceOrderImportZip, setServiceOrderImportZip] = useState<string | null>(null);
  const containerRef = useRef(null);

  // Resizable layout state
  const DEFAULT_SIDEBAR_WIDTH = 300;
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem('rp_sidebarWidth');
    const v = stored ? parseInt(stored, 10) : NaN;
    return isNaN(v) ? DEFAULT_SIDEBAR_WIDTH : v;
  });
  
  const draggingRef = useRef<{ type: string; startX: number; startWidth: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Listen to EventBus for cross-component events
  useEffect(() => {
    // Subscribe to tracks-updated event from transpose
    const unsubscribeTracks = eventBusService.subscribe(
      EVENT_TYPES.TRACKS_UPDATED,
      (payload: unknown) => {
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
  const startSidebarResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startX = e.type.startsWith('touch') ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startWidth = sidebarWidth;
    
    draggingRef.current = { type: 'sidebar', startX, startWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || draggingRef.current.type !== 'sidebar') return;
      const clientX = ev.type.startsWith('touch') ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
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
        await preserviceWindow.open();
      } catch (error) {
        console.error('Failed to open pre-service music window:', error);
      }
    });

    const unlistenStop = event.listen('stop-preservice-music', async () => {
      try {
        await preserviceWindow.close();
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
  const handleSetAllSlides = (slides: unknown[]) => {
    slideViewModel.setSlides(slides);
  };

  const handleSetAllTracks = async (tracks: unknown[], folderPath?: string) => {
    // Set tracks in both AudioViewModel and MixerViewModel
    audioViewModel.setTracks(tracks);
    
    // If we have tracks with file paths, load them into the audio service in one batch
    if (tracks && tracks.length > 0) {
      try {
        // Clear any previously loaded tracks to avoid mixing songs
        await (window as any).electronAPI?.invoke?.('audio:clearTracks');

        // Extract file paths from track objects
        const trackPaths = (tracks as any[])
          .filter(t => t.file_path)
          .map(t => t.file_path);
        
        if (trackPaths.length > 0) {
          console.log('[App] Loading', trackPaths.length, 'tracks into audio service');
          const result = await (window as any).electronAPI?.invoke?.('audio:loadMultipleTracks', trackPaths);
          console.log('[App] Tracks loaded:', result);
        }
      } catch (error) {
        console.warn('[App] Failed to load tracks into audio service:', error);
        // Continue anyway - tracks are still in state
      }
    }
  };

  const handleSetIsLoadingTracks = (isLoading: boolean) => {
    audioViewModel.setIsLoading(isLoading);
  };

  const handleSetCurrentLyrics = (lyrics: string) => {
    serviceOrderViewModel.setSelectedSongForLyrics(lyrics);
  };

  const handleSetSelectedSlide = (slide: unknown) => {
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
          icon={<MusicalNoteIcon className="w-8 h-8" />} 
          label="Audio/MIDI Settings" 
          onClick={() => setIsAudioSettingsOpen(true)}
        />

        <ActivityBarIcon 
          icon={<CogIcon className="w-8 h-8" />} 
          label="Display Settings" 
          onClick={() => setIsDisplaySettingsOpen(true)}
        />

        <ActivityBarIcon 
          icon={<AdjustmentsHorizontalIcon className="w-8 h-8" />} 
          label="Preferences" 
          onClick={() => setIsPreferencesOpen(true)}
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

      <Modal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        title="Preferences"
        size="large"
      >
        <ServiceOrderSettings />
      </Modal>

      <ServiceOrderImportDialog
        zipPath={serviceOrderImportZip}
        isOpen={!!serviceOrderImportZip}
        onImport={(metadata) => {
          console.log('Service order imported:', metadata);
          setServiceOrderImportZip(null);
          // TODO: Load imported service order into UI
        }}
        onCancel={() => setServiceOrderImportZip(null)}
      />
    </div>
  );
});

export default App;
