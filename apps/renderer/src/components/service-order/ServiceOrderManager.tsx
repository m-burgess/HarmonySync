import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { getViewModel } from '../../viewmodels';
import { ArrowDownTrayIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button.tsx';
import { VSCodeInput } from '../VSCodeUI.tsx';
import LyricsFetcher from './LyricsFetcher';

// Type definitions
interface ServiceOrderItem {
  id?: string;
  name: string;
  path: string;
  type: 'song' | 'folder' | 'presentation';
  tracks?: unknown[];
  lyrics?: string;
}

interface ServiceImportedDetail {
  serviceOrder?: ServiceOrderItem[];
  // Add other properties as needed
}

interface LoadItemResult {
  slides?: unknown[];
  tracks?: unknown[];
}

interface ServiceOrderViewModel {
  serviceOrder: ServiceOrderItem[];
  currentSongIndex: number;
  autoplayEnabled: boolean;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  crossfadeDuration: number;
  selectedSongForLyrics: string | null;
  handlePlaybackComplete: () => void;
  handleServiceImported: (detail: ServiceImportedDetail) => void;
  loadItem: (item: ServiceOrderItem, index: number) => Promise<LoadItemResult | null>;
  setCrossfadeDuration: (duration: number) => void;
  toggleAutoplay: () => void;
  addFolders: () => Promise<void>;
  isSongPreloaded: (item: ServiceOrderItem) => boolean;
  isSongPreloading: (item: ServiceOrderItem) => boolean;
  openLyricsFetcher: (item: ServiceOrderItem) => void;
  editLyrics: (item: ServiceOrderItem) => void;
  preloadSong: (item: ServiceOrderItem) => void;
  handleLyricsFetched: (item: ServiceOrderItem) => void;
}

interface ServiceOrderManagerProps {
  setAllSlides: (slides: unknown[]) => void;
  setAllTracks: (tracks: unknown[], folderPath?: string) => void;
  setIsLoadingTracks: (isLoading: boolean) => void;
  setCurrentLyrics: (lyrics: string | null) => void;
}

const ServiceOrderManager: React.FC<ServiceOrderManagerProps> = observer(({
  setAllSlides,
  setAllTracks,
  setCurrentLyrics
}) => {
  const viewModel = getViewModel('serviceOrderViewModel') as ServiceOrderViewModel;

  // Notify backend that component is ready
  useEffect(() => {
    console.log('[ServiceOrderManager] Component mounted, sending ready signal...');
    (window as any).electronAPI?.send?.('service-order-manager-ready');
  }, []);

  // Setup playback completion listener for autoplay
  useEffect(() => {
    const handlePlaybackComplete = () => {
      viewModel.handlePlaybackComplete();
    };

    // Listen for playback complete events via custom DOM events
    window.addEventListener('playbackComplete', handlePlaybackComplete);
    return () => {
      window.removeEventListener('playbackComplete', handlePlaybackComplete);
    };
  }, [viewModel]);

  // Listen for service import events from zip files
  useEffect(() => {
    const handleServiceImported = (event: CustomEvent<ServiceImportedDetail>) => {
      viewModel.handleServiceImported(event.detail);
    };

    window.addEventListener('service-imported', handleServiceImported as EventListener);
    return () => {
      window.removeEventListener('service-imported', handleServiceImported as EventListener);
    };
  }, [viewModel]);

  // Listen for service order loaded events (from imported services)
  useEffect(() => {
    console.log('[ServiceOrderManager] Setting up service order loaded listener...');

    const handleServiceOrderLoaded = (event: any, data: { serviceOrder: ServiceOrderItem[] }) => {
      console.log('[ServiceOrderManager] Service order loaded event received!', data.serviceOrder);
      // Use runInAction to properly update MobX observable
      runInAction(() => {
        viewModel.serviceOrder.replace(data.serviceOrder);
      });
      console.log('[ServiceOrderManager] Service order updated, count:', viewModel.serviceOrder.length);
    };

    const cleanup = (window as any).electronAPI?.onServiceOrderLoaded?.(handleServiceOrderLoaded);
    console.log('[ServiceOrderManager] Listener registered:', !!cleanup);

    return () => {
      console.log('[ServiceOrderManager] Cleaning up listener');
      cleanup?.();
    };
  }, [viewModel]);

  // Handle service order item click with index
  const handleServiceOrderItemClickWithIndex = async (item: ServiceOrderItem, index: number) => {
    const result = await viewModel.loadItem(item, index);
    if (result && setAllSlides && setAllTracks) {
      setAllSlides(result.slides || []);
      setAllTracks(result.tracks || [], item.path);
      if (setCurrentLyrics) {
        setCurrentLyrics(viewModel.selectedSongForLyrics || null);
      }
    }
  };

  // Handle crossfade duration change (set via ViewModel which talks to Go engine)
  const handleCrossfadeDurationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(e.target.value);
    viewModel.setCrossfadeDuration(duration);
  };

  return (
    <div className="col" id="service-order-col">
      {/* Crossfade Control */}
      <div className="mb-2 p-2 bg-stage rounded border border-surface">
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="crossfade-duration" className="font-medium text-primary">
            Crossfade:
          </label>
          <VSCodeInput
            id="crossfade-duration"
            type="range"
            min="500"
            max="8000"
            step="500"
            value={viewModel.crossfadeDuration}
            onChange={handleCrossfadeDurationChange}
            className="w-20"
          />
          <span className="text-muted min-w-fit">
            {(viewModel.crossfadeDuration / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Autoplay Control */}
      <div className="mb-2 p-2 bg-stage rounded border border-surface">
        <div className="flex items-center gap-2 text-xs">
          <VSCodeInput
            id="autoplay-enabled"
            type="checkbox"
            checked={viewModel.autoplayEnabled}
            onChange={() => viewModel.toggleAutoplay()}
            className="w-4 h-4"
          />
          <label htmlFor="autoplay-enabled" className="font-medium text-primary">
            Autoplay next song
          </label>
          {viewModel.currentSongIndex >= 0 && (
            <span className="text-muted ml-auto">
              {viewModel.currentSongIndex + 1}/{viewModel.serviceOrder.length}
            </span>
          )}
        </div>
      </div>

      {/* Add Folder Button */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <Button
          onClick={() => viewModel.addFolders()}
          id="add-folder-button"
          className="w-full"
          disabled={viewModel.isLoading}
        >
          Add to Service Order
        </Button>
      </div>

      {/* Service Order Items */}
      <ul id="service-order">
        {viewModel.serviceOrder.map((item, index) => {
          const isPreloaded = viewModel.isSongPreloaded(item);
          const isCurrentSong = viewModel.currentSongIndex === index;
          const isLoading = viewModel.loadingProgress > 0 && viewModel.loadingProgress < 100 && viewModel.loadingMessage.includes(item.name);

          return (
            <li
              key={item.id || `fallback-${index}`}
              className={`service-order-item ${isLoading ? 'loading' : ''}`}
              onClick={() => handleServiceOrderItemClickWithIndex(item, index)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: 1 }} onClick={() => handleServiceOrderItemClickWithIndex(item, index)}>
                  {isCurrentSong && '▶ '}{isLoading && '⟳ '}{item.name}
                </span>
                {item.type === 'song' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Fetch Lyrics Button */}
                    {!item.lyrics && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewModel.openLyricsFetcher(item);
                        }}
                        title="Fetch lyrics from Genius"
                        variant="ghost"
                        size="small"
                        icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                      >
                      </Button>
                    )}

                    {/* Edit Lyrics Button */}
                    {item.lyrics && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewModel.editLyrics(item);
                        }}
                        title="Edit lyrics"
                        variant="ghost"
                        size="small"
                        icon={<PencilIcon className="w-4 h-4" />}
                      >
                      </Button>
                    )}

                    {/* Song Preload Status Indicator */}
                    {item.type === 'song' && (
                      <span
                        title={
                          isPreloaded
                            ? 'Song is preloaded and ready'
                            : viewModel.isSongPreloading(item)
                              ? 'Loading into memory...'
                              : ''
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          color: isPreloaded ? '#22c55e' : 'var(--text-secondary)',
                          opacity: isPreloaded || viewModel.isSongPreloading(item) ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                        }}
                      >
                        {isPreloaded ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : viewModel.isSongPreloading(item) ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                          </svg>
                        ) : null}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Lyrics Fetcher Modal (disabled) */}
    </div>
  );
});

export default ServiceOrderManager;
