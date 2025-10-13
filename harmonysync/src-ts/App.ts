/**
 * Main Application class
 * Manages the overall application state and layout
 */

import { SetlistManager } from './components/setlist/SetlistManager';
import { SlideManager } from './components/slides/SlideManager';
import { MultitrackPlayer } from './components/multitrack/MultitrackPlayer';
import { AppState, ServiceOrderItem, Slide, Track } from './types';

export class App {
  private state: AppState;
  private container: HTMLElement;
  private setlistManager: SetlistManager;
  private slideManager: SlideManager;
  private multitrackPlayer: MultitrackPlayer;

  constructor(containerId: string = 'root') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    this.container = container;

    // Initialize state
    this.state = {
      allSlides: [],
      allTracks: [],
      serviceOrder: [],
      selectedSlide: null,
      isLibraryVisible: true,
    };

    // Build the UI
    this.buildUI();

    // Initialize components
    this.setlistManager = new SetlistManager({
      parent: this.container.querySelector('.left-column') as HTMLElement,
      onSlideChange: (slides) => this.handleSlideChange(slides),
      onTrackChange: (tracks) => this.handleTrackChange(tracks),
      onServiceOrderChange: (order) => this.handleServiceOrderChange(order),
    });

    this.slideManager = new SlideManager({
      parent: this.container.querySelector('.center-column') as HTMLElement,
      onSlideSelect: (slide) => this.handleSlideSelect(slide),
    });

    this.multitrackPlayer = new MultitrackPlayer({
      parent: this.container.querySelector('.bottom-panel') as HTMLElement,
      onTrackUpdate: (tracks) => this.handleTrackUpdate(tracks),
    });

    // Listen to Tauri events
    this.setupTauriListeners();
  }

  private buildUI(): void {
    this.container.className = 'app-container';
    this.container.innerHTML = `
      <div class="app-layout">
        <div class="main-area">
          <div class="left-column"></div>
          <div class="center-column"></div>
        </div>
        <div class="bottom-panel"></div>
      </div>
    `;
  }

  private handleSlideChange(slides: Slide[]): void {
    this.state.allSlides = slides;
    this.slideManager.setSlides(slides);
  }

  private handleTrackChange(tracks: Track[]): void {
    this.state.allTracks = tracks;
    this.multitrackPlayer.setTracks(tracks);
  }

  private handleServiceOrderChange(order: ServiceOrderItem[]): void {
    this.state.serviceOrder = order;
  }

  private handleSlideSelect(slide: Slide): void {
    this.state.selectedSlide = slide;
    // In a real implementation, this would update the audience screen
  }

  private handleTrackUpdate(tracks: Track[]): void {
    this.state.allTracks = tracks;
    // In a real implementation, this would update the audio playback
  }

  private async setupTauriListeners(): Promise<void> {
    try {
      // Check if we're running in Tauri
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { event } = (window as any).__TAURI__;

        // Listen for video-ended event
        await event.listen('video-ended', () => {
          console.log('Video ended, advancing to next slide');
          this.advanceSlide();
        });

        // Listen for import events
        await event.listen('song-imported', () => {
          console.log('Song imported, refreshing library');
          // Trigger library refresh
        });

        await event.listen('presentation-imported', () => {
          console.log('Presentation imported, refreshing library');
          // Trigger library refresh
        });
      }
    } catch (error) {
      console.error('Error setting up Tauri listeners:', error);
    }
  }

  private advanceSlide(): void {
    if (this.state.selectedSlide && this.state.allSlides.length > 0) {
      const currentIndex = this.state.allSlides.findIndex(
        (s) => s.id === this.state.selectedSlide?.id
      );
      if (currentIndex >= 0 && currentIndex < this.state.allSlides.length - 1) {
        const nextSlide = this.state.allSlides[currentIndex + 1];
        this.slideManager.setSelectedSlide(nextSlide);
        this.state.selectedSlide = nextSlide;
      }
    }
  }

  // Public API for testing
  public loadTestData(): void {
    // Load sample service order
    const sampleOrder: ServiceOrderItem[] = [
      {
        type: 'song',
        id: 'song1',
        name: 'Amazing Grace',
        loaded: false,
        slides: [
          { id: 'slide1', content: 'Amazing grace, how sweet the sound', type: 'lyric' },
          { id: 'slide2', content: 'That saved a wretch like me', type: 'lyric' },
        ],
        tracks: [
          { id: 'track1', name: 'Vocals', url: '', volume: 0.8, pan: 0, muted: false, solo: false, loaded: false },
          { id: 'track2', name: 'Guitar', url: '', volume: 0.7, pan: -0.5, muted: false, solo: false, loaded: false },
        ],
      },
      {
        type: 'presentation',
        id: 'pres1',
        name: 'Welcome Slides',
        loaded: false,
        slides: [
          { id: 'slide3', content: 'Welcome', type: 'lyric' },
          { id: 'slide4', content: 'Announcements', type: 'lyric' },
        ],
        tracks: [],
      },
    ];

    this.setlistManager.setServiceOrder(sampleOrder);
  }
}
