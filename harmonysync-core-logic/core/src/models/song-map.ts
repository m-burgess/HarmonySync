export interface LyricLine {
    text: string;
    timestamp?: string;
}

export interface SongSection {
    id: string;
    label: string;
    lyrics: string;
    chords: string;
    lines?: LyricLine[];
}

export interface SongMap {
    bpm: number;
    songLength: string; // e.g., "3:41"
    timeSignature: string; // e.g., "4/4"
    originalKey?: string;
    lyricsUrl?: string;
    midiNotes?: string[];
    sections: SongSection[];
}
