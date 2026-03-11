import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { SongMap, SongSection } from '../models/song-map';
import { randomUUID } from 'crypto';

export class SongMapper {
    /**
     * Parses a standardized XML string into a SongMap object.
     */
    static parse(content: string): SongMap {
        const defaultMap: SongMap = {
            bpm: 78,
            timeSignature: '4/4',
            songLength: '0:00',
            originalKey: 'C',
            sections: []
        };

        if (!content || !content.trim()) {
            return defaultMap;
        }

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseTagValue: false, // keep everything as strings initially
            isArray: (name) => {
                // Ensure specific nodes are always treated as arrays
                return name === 'part';
            }
        });

        let xmlObj;
        try {
            xmlObj = parser.parse(content);
        } catch (e) {
            console.warn('Failed to parse SongMap as XML, returning default format', e);
            return defaultMap;
        }

        const root = xmlObj.song;
        if (!root) {
            // Attempt fallback legacy text parsing if not a valid XML root
             console.warn('SongMap does not contain <song> root, returning default format');
             return defaultMap;
        }

        const songMap: SongMap = { ...defaultMap };

        if (root.title) {
           // We might want to store title in SongMap, but keeping backwards compatible interface for now
        }
        if (root.bpm) songMap.bpm = parseInt(root.bpm as string, 10) || defaultMap.bpm;
        if (root.timing) songMap.timeSignature = typeof root.timing === 'string' ? root.timing.trim() : defaultMap.timeSignature;
        if (root.length) songMap.songLength = typeof root.length === 'string' ? root.length.trim() : defaultMap.songLength;
        if (root.key) songMap.originalKey = typeof root.key === 'string' ? root.key.trim() : defaultMap.originalKey;
        if (root.lyricsURL) songMap.lyricsUrl = typeof root.lyricsURL === 'string' ? root.lyricsURL.trim() : undefined;
        
        if (root.midiNotes) {
            const notesStr = String(root.midiNotes).trim();
            if (notesStr) {
                songMap.midiNotes = notesStr.split(',').map(n => n.trim()).filter(Boolean);
            }
        }

        // Parse sections (parts)
        if (root.part && Array.isArray(root.part)) {
            for (const part of root.part) {
                const label = part['@_name'] || 'Unknown Part';
                const chords = typeof part.chords === 'string' ? part.chords.trim() : '';
                
                // Allow empty lyrics or string lyrics
                const lyrics = typeof part.lyrics === 'string' ? part.lyrics.trim() : ''; 

                songMap.sections.push({
                    id: randomUUID(), // using Node's crypto
                    label,
                    chords,
                    lyrics
                });
            }
        }

        return songMap;
    }

    static stringify(map: SongMap, title: string = 'Untitled'): string {
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            indentBy: '  ',
            suppressEmptyNode: false
        });

        const obj: any = {
            song: {
                title: title,
                bpm: map.bpm,
                timing: map.timeSignature,
                length: map.songLength,
                key: map.originalKey || '',
                lyricsURL: map.lyricsUrl || ''
            }
        };

        if (map.midiNotes && map.midiNotes.length > 0) {
            obj.song.midiNotes = map.midiNotes.join(', ');
        }

        if (map.sections && map.sections.length > 0) {
            obj.song.part = map.sections.map(section => ({
                '@_name': section.label,
                chords: section.chords || '',
                lyrics: section.lyrics || ''
            }));
        } else {
             obj.song.part = [];
        }

        return builder.build(obj);
    }
}
