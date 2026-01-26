/**
 * Central export for all TypeScript type definitions
 */

// Models
export type {
  AudioTrack,
  Slide,
  Song,
  SetlistFolder,
  Display,
  DisplayWindow,
  MixerConfig,
  MemoryUsage,
  TransposeResult,
  TransposeProgress,
  FileSelectionResult,
  FolderSelectionResult,
} from './models';

// Events
export {
  EVENT_TYPES,
  type EventType,
  type EventPayload,
  type EventHandler,
  type UnsubscribeFunction,
  type EventRecord,
  type TrackLoadedPayload,
  type PlaybackStatePayload,
  type TracksUpdatedPayload,
  type VolumeChangedPayload,
  type TransposeStartedPayload,
  type TransposeCompletedPayload,
  type TransposeFailedPayload,
  type SlideChangedPayload,
  type SlideImportedPayload,
  type SlidesLoadedPayload,
  type SlideDisplayedPayload,
  type SongLoadedPayload,
  type SongChangedPayload,
  type FolderAddedPayload,
  type SetlistUpdatedPayload,
  type DisplayConfigChangedPayload,
  type WindowOpenedPayload,
  type WindowClosedPayload,
  type ErrorPayload,
} from './events';

// Services
export type {
  IService,
  IIpcService,
  IEventBusService,
  IAudioService,
  IFileService,
  IDisplayService,
  ISlideService,
  ISetlistService,
} from './services';

// ViewModels
export type {
  IViewModel,
  IAudioViewModel,
  ISetlistViewModel,
  ISlideViewModel,
  IDisplayViewModel,
  IMixerViewModel,
} from './viewmodels';
