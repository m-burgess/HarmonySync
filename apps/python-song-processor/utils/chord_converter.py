CHROMATIC_SCALE_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
CHROMATIC_SCALE_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

def get_chromatic_scale(key):
    # Determine if key uses sharps or flats
    flat_keys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']
    if key in flat_keys:
        return CHROMATIC_SCALE_FLATS
    return CHROMATIC_SCALE_SHARPS

def absolute_to_nashville(absolute_chords_str, key):
    """
    Converts a string of absolute chords (e.g. 'F#m D Bm') to Nashville Numbers (e.g. '6m 4 2m') based on the key.
    """
    if not key or not absolute_chords_str:
        return absolute_chords_str
        
    scale = get_chromatic_scale(key)
    
    # Base note of the key
    base_note = key.replace('m', '') # Major relative if minor key provided, though usually it's major
    if base_note not in scale:
        # Fallback if key is weirdly formatted
        if base_note in CHROMATIC_SCALE_SHARPS:
            scale = CHROMATIC_SCALE_SHARPS
        elif base_note in CHROMATIC_SCALE_FLATS:
            scale = CHROMATIC_SCALE_FLATS
        else:
            return absolute_chords_str

    base_idx = scale.index(base_note)
    
    # Build a map of scale degrees
    # Major scale formula: W, W, H, W, W, W, H -> +2, +2, +1, +2, +2, +2, +1
    major_intervals = [0, 2, 4, 5, 7, 9, 11]
    degree_map = {}
    for i, interval in enumerate(major_intervals):
        note = scale[(base_idx + interval) % 12]
        degree_map[note] = str(i + 1)
        
    # Also map the flat/sharp equivalents just in case the chord mixes them
    alt_scale = CHROMATIC_SCALE_FLATS if scale == CHROMATIC_SCALE_SHARPS else CHROMATIC_SCALE_SHARPS
    for i, interval in enumerate(major_intervals):
        note = alt_scale[(base_idx + interval) % 12]
        degree_map[note] = str(i + 1)

    parts = absolute_chords_str.replace('.', ' ').split()
    nashville_parts = []
    
    for part in parts:
        # Extract root note and modifiers
        root = part[0]
        if len(part) > 1 and part[1] in ['#', 'b']:
            root += part[1]
            modifier = part[2:]
        else:
            modifier = part[1:]
            
        if root in degree_map:
            number = degree_map[root]
            # Handle standard modifiers for Nashville
            # Convert 'min', 'm' to 'm', keep 'dim', 'aug', 'sus', etc.
            if modifier.startswith('m') and not modifier.startswith('maj'):
                number += 'm' + modifier[1:]
            else:
                number += modifier
            nashville_parts.append(number)
        else:
            # If not in diatonic scale, calculate flat/sharp degree
            # Find the chromatic interval
            try:
                root_idx = scale.index(root)
            except ValueError:
                try:
                    root_idx = alt_scale.index(root)
                except ValueError:
                    nashville_parts.append(part)
                    continue
                    
            interval = (root_idx - base_idx) % 12
            
            # Non-diatonic mapping (b2, b3, #4, b6, b7)
            if interval == 1: degree = "b2"
            elif interval == 3: degree = "b3"
            elif interval == 6: degree = "b5" # or #4
            elif interval == 8: degree = "b6"
            elif interval == 10: degree = "b7"
            else: degree = "?"
            
            if modifier.startswith('m') and not modifier.startswith('maj'):
                degree += 'm' + modifier[1:]
            else:
                degree += modifier
            nashville_parts.append(degree)

    return " ".join(nashville_parts)
