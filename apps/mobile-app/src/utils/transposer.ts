/**
 * Musical keys and their notes
 */
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Transposer Utility
 * Handles conversion of numerical chords to letter chords and capo calculation.
 */
export class Transposer {
    /**
     * Get the scale for a given key
     */
    static getScale(key: string): string[] {
        const startIndex = KEYS.indexOf(key);
        if (startIndex === -1) return KEYS;

        // Simplistic major scale mapping (W-W-H-W-W-W-H)
        // For this context, we just need the 1st, 2nd, 3rd... notes relative to the key
        // 1=0, 2=2, 3=4, 4=5, 5=7, 6=9, 7=11
        const steps = [0, 2, 4, 5, 7, 9, 11];
        return steps.map(step => KEYS[(startIndex + step) % 12]);
    }

    /**
     * Transpose a letter chord (e.g. "G", "Am7", "F#/Bb") from one key to another.
     */
    static transposeLetterChord(chord: string, fromKey: string, toKey: string): string {
        if (!chord || fromKey === toKey) return chord;

        // Handle slash chords
        if (chord.includes('/')) {
            const [top, bottom] = chord.split('/');
            return `${this.transposeLetterChord(top, fromKey, toKey)}/${this.transposeLetterChord(bottom, fromKey, toKey)}`;
        }

        // Extract root note (A-G with optional #/b) and suffix
        const match = chord.match(/^([A-G][#b]?)(.*)$/);
        if (!match) return chord;

        const rootNote = match[1];
        const suffix = match[2];

        // Find semitone distance between fromKey and toKey
        const fromIdx = KEYS.indexOf(fromKey);
        const toIdx = KEYS.indexOf(toKey);
        const interval = (toIdx - fromIdx + 12) % 12;

        // Find new root note
        const rootIdx = KEYS.indexOf(rootNote);
        if (rootIdx === -1) return chord;

        const newRootIdx = (rootIdx + interval) % 12;
        return KEYS[newRootIdx] + suffix;
    }

    /**
     * Transpose a numerical chord (e.g. "1", "6m", "4/5") to a letter chord in a target key.
     */
    static transposeChord(numChord: string, targetKey: string): string {
        if (!numChord) return '';

        const scale = this.getScale(targetKey);

        // Handle slash chords (e.g. "4/5")
        if (numChord.includes('/')) {
            const parts = numChord.split('/');
            return `${this.transposeChord(parts[0], targetKey)}/${this.transposeChord(parts[1], targetKey)}`;
        }

        // Extract number and suffix (e.g. "6m" -> "6", "m")
        const match = numChord.match(/^([1-7])(.*)$/);
        if (!match) return numChord; // Return as-is if not 1-7

        const num = parseInt(match[1], 10);
        const suffix = match[2];

        const note = scale[num - 1] || '';
        return note + suffix;
    }

    /**
     * Parse a chord progression string (e.g. "1-4-6m-5") into an array of transposed chords.
     */
    static transposeProgression(progression: string, targetKey: string): string[] {
        if (!progression) return [];
        return progression.split(/[\s,\-]+/).filter(c => c.length > 0).map(c => this.transposeChord(c.trim(), targetKey));
    }

    /**
     * Calculate Capo
     * Goal: Suggest a capo fret to play in "G" or "C" shapes for the target key.
     */
    static calculateCapo(targetKey: string): { fret: number; shape: 'G' | 'C'; keyToPlay: string } {
        const targetIdx = KEYS.indexOf(targetKey);

        // Check G shape (targetKey = G + fret)
        const gIdx = KEYS.indexOf('G');
        let gFret = (targetIdx - gIdx + 12) % 12;

        // Check C shape (targetKey = C + fret)
        const cIdx = KEYS.indexOf('C');
        let cFret = (targetIdx - cIdx + 12) % 12;

        // Prefer lower fret, or G shape if frets are high
        if (gFret <= 5) {
            return { fret: gFret, shape: 'G', keyToPlay: 'G' };
        } else if (cFret <= 5) {
            return { fret: cFret, shape: 'C', keyToPlay: 'C' };
        } else {
            // Fallback to whichever is smaller
            return gFret < cFret
                ? { fret: gFret, shape: 'G', keyToPlay: 'G' }
                : { fret: cFret, shape: 'C', keyToPlay: 'C' };
        }
    }
}
