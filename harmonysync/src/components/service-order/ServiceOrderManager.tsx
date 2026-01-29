/**
 * ServiceOrderManager - MVVM Refactored View Component
 * 
 * This component is refactored to use MVVM architecture:
 * - All business logic moved to ServiceOrderViewModel
 * - Component wrapped with observer() to react to ViewModel changes
 * - No useState/useEffect for business state
 * - Pure presentation logic only (~130 lines vs original 735 lines)
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../../viewmodels';
import { ArrowDownTrayIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import LyricsFetcher from './LyricsFetcher';
import { onPlaybackComplete, offPlaybackComplete, setCrossfadeDuration } from '../../utils/audio';

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
  selectedSongForLyrics: ServiceOrderItem | null;
  handlePlaybackComplete: () => void;
  handleServiceImported: (detail: ServiceImportedDetail) => void;
  loadItem: (item: ServiceOrderItem, index: number) => Promise<LoadItemResult | null>;
  setCrossfadeDuration: (duration: number) => void;
  toggleAutoplay: () => void;
  addFolders: () => Promise<void>;
  isSongPreloaded: (item: ServiceOrderItem) => boolean;
  openLyricsFetcher: (item: ServiceOrderItem) => void;
  editLyrics: (item: ServiceOrderItem) => void;
  preloadSong: (item: ServiceOrderItem) => void;
  handleLyricsFetched: (item: ServiceOrderItem) => void;
}

interface ServiceOrderManagerProps {
  setAllSlides?: (slides: unknown[]) => void;
  setAllTracks?: (tracks: unknown[]) => void;
  setIsLoadingTracks?: (loading: boolean) => void;
  setCurrentLyrics?: (lyrics: string) => void;
}

const ServiceOrderManager: React.FC<ServiceOrderManagerProps> = observer(({ 
  setAllSlides, 
  setAllTracks, 
  setIsLoadingTracks, 
  setCurrentLyrics 
}) => {
  const viewModel = getViewModel('setlistViewModel') as ServiceOrderViewModel;

  // Setup playback completion listener for autoplay
  useEffect(() => {
    const handlePlaybackComplete = () => {
      viewModel.handlePlaybackComplete();
    };

    onPlaybackComplete(handlePlaybackComplete);
    return () => {
      offPlaybackComplete(handlePlaybackComplete);
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

  // Handle service order item click with index
  const handleServiceOrderItemClickWithIndex = async (item: ServiceOrderItem, index: number) => {
    const result = await viewModel.loadItem(item, index);
    if (result && setAllSlides && setAllTracks) {
      setAllSlides(result.slides || []);
      setAllTracks(result.tracks || []);
      if (setCurrentLyrics && item.lyrics) {
        setCurrentLyrics(item.lyrics);
      }
    }
  };

  // Handle crossfade duration change
  const handleCrossfadeDurationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(e.target.value);
    viewModel.setCrossfadeDuration(duration);
    try {
      await setCrossfadeDuration(duration);
    } catch (error) {
      console.error('Failed to set crossfade duration:', error);
    }
  };

  return (
    <div className="col" id="service-order-col">
      {/* Crossfade Control */}
      <div className="mb-2 p-2 bg-stage rounded border border-surface">
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="crossfade-duration" className="font-medium text-primary">
            Crossfade:
          </label>
          <input
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
          <input
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
        <button 
          onClick={() => viewModel.addFolders()} 
          id="add-folder-button" 
          style={{ flex: 1 }}
          disabled={viewModel.isLoading}
        >
          Add to Service Order
        </button>
      </div>

      {/* Loading Progress */}
      {viewModel.loadingProgress > 0 && viewModel.loadingProgress < 100 && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${viewModel.loadingProgress}%` }}></div>
          <div className="progress-text">{viewModel.loadingMessage} ({viewModel.loadingProgress}%)</div>
        </div>
      )}
      {viewModel.loadingProgress === 100 && (
        <div className="progress-container">
          <div className="progress-text">{viewModel.loadingMessage}</div>
        </div>
      )}

      {/* Service Order Items */}
      <ul id="service-order">
        {viewModel.serviceOrder.map((item, index) => {
          const isPreloaded = viewModel.isSongPreloaded(item);
          const isCurrentSong = viewModel.currentSongIndex === index;
          
          return (
            <li 
              key={item.id || `fallback-${index}`} 
              className={`service-order-item ${isCurrentSong ? 'current-song' : ''}`}
              onClick={() => handleServiceOrderItemClickWithIndex(item, index)}
              style={{ 
                backgroundColor: isCurrentSong ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderLeft: isCurrentSong ? '3px solid #3b82f6' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: 1 }} onClick={() => handleServiceOrderItemClickWithIndex(item, index)}>
                  {isCurrentSong && '▶ '}{item.name}
                </span>
                {item.type === 'song' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Fetch Lyrics Button */}
                    {!item.lyrics && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          viewModel.openLyricsFetcher(item);
                        }}
                        title="Fetch lyrics from Genius"
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: '#3b82f6'
                        }}
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Edit Lyrics Button */}
                    {item.lyrics && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          viewModel.editLyrics(item);
                        }}
                        title="Edit lyrics"
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid currentColor',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Preload Button */}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        viewModel.preloadSong(item);
                      }}
                      title={isPreloaded ? "Song is preloaded and ready" : "Preload song"}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: isPreloaded ? '#10b981' : 'transparent',
                        color: isPreloaded ? 'white' : 'inherit',
                        border: isPreloaded ? 'none' : '1px solid currentColor',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isPreloaded ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Ready</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          <span>Preload</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      
      {/* Lyrics Fetcher Modal */}
      {viewModel.selectedSongForLyrics && (
        <LyricsFetcher 
          songItem={viewModel.selectedSongForLyrics}
          onLyricsFetched={(item) => viewModel.handleLyricsFetched(item)}
        />
      )}
    </div>
  );
});

export default ServiceOrderManager;
