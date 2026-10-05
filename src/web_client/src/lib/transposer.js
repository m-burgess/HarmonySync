const CHROMATIC_SCALE = [
    "C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"
];

const getNoteIndex = (note) => {
    const idx = CHROMATIC_SCALE.indexOf(note);
    if (idx !== -1) return idx;
    
    const flatToSharp = {
        "Db": 1, "D#": 3, "Gb": 6, "Ab": 8, "A#": 10
    };
    return flatToSharp[note] !== undefined ? flatToSharp[note] : -1;
};

export const suggestCapoKey = (originalKey) => {
    const rootIdx = getNoteIndex(originalKey);
    if (rootIdx === -1) return "C";
    
    // Keys that fit C well: Db, D, Eb, E, F
    if (rootIdx >= 1 && rootIdx <= 5) return "C";
    // Keys that fit G well: Ab, A, Bb, B
    return "G";
};

export const nashvilleToStandard = (nashville, targetKey) => {
    if (!nashville || !targetKey) return nashville;
    
    const rootIdx = getNoteIndex(targetKey);
    if (rootIdx === -1) return nashville;
    
    const scaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    const degreeToNote = (degree) => CHROMATIC_SCALE[(rootIdx + scaleIntervals[degree - 1]) % 12];

    const match = nashville.match(/^([1-7])(.*)$/);
    if (match) {
        const degree = parseInt(match[1], 10);
        let modifier = match[2];
        // Slash chords: the bass is a scale degree too, e.g. "1/3" -> "C/E" in C.
        const slash = modifier.match(/^(.*)\/([1-7])$/);
        if (slash) {
            modifier = `${slash[1]}/${degreeToNote(parseInt(slash[2], 10))}`;
        }
        return degreeToNote(degree) + modifier;
    }
    return nashville;
};

export const toCagedLeadShape = (standardChord) => {
    if (!standardChord) return standardChord;
    
    let root = standardChord.substring(0, 1);
    if (standardChord.length > 1 && (standardChord[1] === '#' || standardChord[1] === 'b')) {
        root = standardChord.substring(0, 2);
    }
    
    const rootIdx = getNoteIndex(root);
    if (rootIdx === -1) return standardChord;
    
    let shape = "A";
    if (rootIdx >= 7 && rootIdx <= 11) {
        shape = "D";
    } else if (rootIdx >= 2 && rootIdx <= 6) {
        shape = "A";
    } else {
        shape = "C";
    }
    
    const shapeRootIdx = getNoteIndex(shape);
    const fret = (rootIdx - shapeRootIdx + 12) % 12;
    
    return `${standardChord} [${shape}-shape fret ${fret}]`;
};

export const getCapoFret = (originalKey, targetKey) => {
    const origIdx = getNoteIndex(originalKey);
    const targetIdx = getNoteIndex(targetKey);
    if (origIdx === -1 || targetIdx === -1) return 0;
    
    return (origIdx - targetIdx + 12) % 12;
};
