export interface SongSection {
    id: string;
    label: string;
    lyrics: string;
    chords: string;
    bars: number;
}

export interface SongMap {
    bpm: number;
    songLength: string; // e.g., "3:41"
    timeSignature: string; // e.g., "4/4"
    sections: SongSection[];
}
