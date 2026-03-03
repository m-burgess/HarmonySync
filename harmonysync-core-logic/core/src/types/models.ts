/**
 * Common Data Models
 * Shared type definitions for data structures used across IPC
 */

// ==================== Media Models ====================

export interface AudioMetadata {
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
  codec?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  codec?: string;
  hasAudio: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

// ==================== Progress Models ====================

export interface ConversionProgress {
  percent: number;
  processedFrames?: number;
  totalFrames?: number;
  currentTime?: number;
  totalTime?: number;
  message?: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  currentFile?: string;
  status: 'syncing' | 'complete' | 'error';
  error?: string;
}

// (rest of file identical to electron/types/models.ts)

export interface SlideContent {
  type: 'text' | 'image' | 'video' | 'html' | 'lyrics';
  content: string;
  styles?: Record<string, string>;
  background?: string;
  transition?: string;
  duration?: number;
}

export interface LowerThirdsData {
  visible: boolean;
  name?: string;
  title?: string;
  position?: 'bottom' | 'top';
  style?: 'simple' | 'modern' | 'classic';
}

export interface DisplayConfig {
  id: string;
  name: string;
  type: 'audience' | 'confidence' | 'lowerthirds' | 'custom';
  enabled: boolean;
  displayId?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings?: Record<string, any>;
  order?: number;
}

export interface LyricsLine {
  time?: number;
  text: string;
}

export interface LyricsData {
  title: string;
  artist: string;
  lines: LyricsLine[];
  source?: string;
}

export interface LyricsSearchResult {
  title: string;
  artist: string;
  source: string;
  url: string;
  confidence?: number;
}

export interface ScheduledEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string | Date;
  endTime?: string | Date;
  type: 'service' | 'rehearsal' | 'special' | 'other';
  actions?: EventAction[];
  repeat?: RepeatConfig;
  reminders?: ReminderConfig[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EventAction {
  type: 'display' | 'audio' | 'macro' | 'script';
  target: string;
  params?: Record<string, any>;
  delay?: number;
}

export interface RepeatConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string | Date;
}

export interface ReminderConfig {
  minutesBefore: number;
  message?: string;
}

export interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
  hotkey?: string;
  enabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MacroAction {
  type: 'display' | 'audio' | 'window' | 'delay' | 'script';
  command: string;
  params?: Record<string, any>;
  delay?: number;
}

export interface Script {
  id: string;
  name: string;
  description?: string;
  code: string;
  language: 'javascript' | 'python';
  enabled?: boolean;
  autorun?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ScriptExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface Slide {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'html' | 'lyrics' | 'youtube' | 'canva';
  content: SlideContent;
  thumbnail?: string;
  order?: number;
  groupId?: string;
  tags?: string[];
  action?: {
    timer?: string;
    targets?: string[];
    midi?: string[];
  };
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SlideGroup {
  id: string;
  name: string;
  slides: Slide[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer?: string;
  type: 'input' | 'output';
  connected: boolean;
}

export interface MIDIMessage {
  type: 'noteon' | 'noteoff' | 'cc' | 'programchange' | 'pitchbend';
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  program?: number;
  timestamp?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  modifiedTime: string | Date;
  isFolder: boolean;
}

export interface SyncConfig {
  provider: 'gdrive' | 'dropbox';
  folderId: string;
  localPath: string;
  autoSync?: boolean;
  syncInterval?: number;
}

export interface RemoteControlStatus {
  running: boolean;
  port: number;
  connectedClients: number;
  url?: string;
}

export interface RemoteControlEvent {
  type: 'connected' | 'disconnected' | 'command' | 'error';
  clientId?: string;
  data?: any;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
  createdTime?: Date;
}

export interface DirectoryEntry extends FileInfo {
  children?: DirectoryEntry[];
}

export interface ElectronError {
  code?: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnail?: string;
  author?: string;
  formats?: YouTubeFormat[];
}

export interface YouTubeFormat {
  itag: number;
  quality: string;
  type: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface DBQueryResult {
  rows: any[];
  changes?: number;
  lastID?: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  isVisible: boolean;
  isFullScreen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  bounds: WindowBounds;
}

export interface ServiceStatus {
  name: string;
  running: boolean;
  initialized: boolean;
  error?: string;
}

export interface TextOverlayOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  alignment?: 'left' | 'center' | 'right';
  padding?: number;
  maxWidth?: number;
}

export interface BackgroundOptions {
  type: 'solid' | 'gradient' | 'image' | 'video';
  color?: string;
  colors?: string[];
  gradientDirection?: string;
  imagePath?: string;
  videoPath?: string;
  opacity?: number;
  blur?: number;
}

// ==================== Presentation Manifest Models ====================

export interface PresentationManifest {
  youtube?: string;
  canva?: string;
  midi?: string[];
  music?: {
    playlist: string;
    start: string;
    end: string;
  };
  slideMidi?: Record<string, string[]>;
  folderMidi?: Record<string, string[]>;
}

export interface SermonData {
  manifest: PresentationManifest;
  slides: Slide[];
}
