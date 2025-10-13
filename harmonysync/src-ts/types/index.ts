/**
 * Base types for the application
 */

export interface Slide {
  id: string;
  content: string;
  type: 'lyric' | 'image' | 'video' | 'blank';
  background?: string;
  order?: number;
}

export interface Track {
  id: string;
  name: string;
  url: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  loaded: boolean;
}

export interface ServiceOrderItem {
  type: 'song' | 'presentation';
  id: string;
  name: string;
  loaded: boolean;
  slides: Slide[];
  tracks: Track[];
}

export interface AppState {
  allSlides: Slide[];
  allTracks: Track[];
  serviceOrder: ServiceOrderItem[];
  selectedSlide: Slide | null;
  isLibraryVisible: boolean;
}

export type EventHandler<T = Event> = (event: T) => void;
export type StateUpdater<T> = (newState: T) => void;
