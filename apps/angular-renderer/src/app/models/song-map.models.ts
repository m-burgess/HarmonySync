export interface SongSection {
    id: string;
    label: string;
    lyrics: string;
    chords: string;
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

export interface SongMapModalData {
    songName: string;
    songPath: string;
    existingMap?: SongMap;
}
