/**
 * Slide/Lyric representation for HarmonySync
 */
export interface Slide {
    id: string;
    title?: string;
    name?: string;
    content?: string;
    type?: 'image' | 'video' | 'youtube' | 'lyric';
    path?: string;
    thumbnail_path?: string;
    duration?: number;
    videoId?: string;
    text?: string[];
    section?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    order: number;
}

/**
 * Lyric slide content (used for audience display)
 */
export interface LyricSlide {
    text: string[];
    section: string;
    type: 'lyric';
}

/**
 * Image content for display
 */
export interface ImageContent {
    type: 'image';
    path: string;
    name: string;
}

/**
 * Lyrics content for display
 */
export interface LyricsContent {
    type: 'lyrics';
    text: string[];
}

/**
 * Display content (union type)
 */
export type DisplayContent = LyricsContent | ImageContent | null;

/**
 * Load from folder result
 */
export interface LoadFromFolderResult {
    slides: Slide[];
    tracks: any[]; // Assuming any for now as AudioService handles tracks
}
