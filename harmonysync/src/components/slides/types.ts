/**
 * Type definitions for slide components
 * These types define the data structures used in the slide system
 */

/**
 * Base slide type - can be lyrics, image, video, or youtube
 */
export type SlideType = 'lyric' | 'image' | 'video' | 'youtube';

/**
 * Size variants for slide display
 */
export type SlideSize = 'small' | 'medium' | 'large';

/**
 * Common properties for all slide types
 */
interface BaseSlide {
  name: string;
  type: SlideType;
}

/**
 * Lyric slide - displays text content organized in sections
 */
export interface LyricSlide extends BaseSlide {
  type: 'lyric';
  text: string[];
  section?: string;
}

/**
 * Image slide - displays a static image
 */
export interface ImageSlide extends BaseSlide {
  type: 'image';
  path: string;
}

/**
 * Video slide - displays a video file
 */
export interface VideoSlide extends BaseSlide {
  type: 'video';
  path: string;
  duration?: number;
  thumbnail_path?: string;
}

/**
 * YouTube slide - displays a YouTube video
 */
export interface YouTubeSlide extends BaseSlide {
  type: 'youtube';
  videoId: string;
}

/**
 * Union type for all slide types
 */
export type SlideData = LyricSlide | ImageSlide | VideoSlide | YouTubeSlide;

/**
 * Import options for slides
 */
export interface SlideImportOptions {
  dpi: number;
  format: 'png' | 'jpeg';
  deleteZip?: boolean;
  importSlidesOnly?: boolean;
}

/**
 * Import progress information
 */
export interface SlideImportProgress {
  message?: string;
  current?: number;
  total?: number;
}

/**
 * Service structure from zip import
 */
export interface ServiceStructure {
  servicePath?: string;
  slides?: SlideData[];
  songs?: unknown[];
  [key: string]: unknown;
}

/**
 * Import result from zip file
 */
export interface ZipImportResult {
  slides?: SlideData[];
  servicePath?: string;
}

/**
 * Drag event with position
 */
export interface SlideDragEvent extends React.DragEvent<HTMLDivElement> {
  dataTransfer: DataTransfer;
}

/**
 * Position for drag and drop
 */
export interface SlidePosition {
  x: number;
  y: number;
}

/**
 * Grid item data for virtualized rendering
 */
export interface SlideGridItemData {
  allSlides: SlideData[];
  columns: number;
  thumbnailSize: number;
  selectedSlide: SlideData | null;
  handleSlideClick: (index: number) => void;
  handleDragStart: (e: React.DragEvent, position: number) => void;
  handleDragEnter: (e: React.DragEvent, position: number) => void;
  handleDrop: (e: React.DragEvent, position: number) => void;
  handleDragEnd: () => void;
  handleVideoTranscoded: (index: number, transcodedPath: string) => void;
}

/**
 * File filter for file dialogs
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}
