import { SongMap, SongSection } from '../models/song-map.models';

export class SongMapParser {
    /**
     * Parses a standardized lyrics.txt string into a SongMap object.
     */
    static parse(content: string): SongMap {
        const lines = content.split('\n');
        const songMap: SongMap = {
            bpm: 78,
            timeSignature: '4/4',
            songLength: '0:00',
            originalKey: 'C',
            sections: []
        };

        const isMap = content.includes('BPM:') || content.includes('Time:') || content.includes('[');

        if (!isMap) {
            songMap.sections.push({
                id: crypto.randomUUID(),
                label: 'Verse 1',
                chords: '',
                lyrics: content.trim()
            });
            return songMap;
        }

        let currentSection: SongSection | null = null;
        let sectionLyrics: string[] = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.startsWith('BPM:')) {
                songMap.bpm = parseInt(line.replace('BPM:', '').trim(), 10) || 78;
                continue;
            }
            if (line.startsWith('Time:')) {
                songMap.timeSignature = line.replace('Time:', '').trim() || '4/4';
                continue;
            }
            if (line.startsWith('Length:')) {
                songMap.songLength = line.replace('Length:', '').trim() || '0:00';
                continue;
            }
            if (line.startsWith('Key:')) {
                songMap.originalKey = line.replace('Key:', '').trim() || 'C';
                continue;
            }
            if (line.startsWith('Lyrics URL:') || line.startsWith('Link:')) {
                songMap.lyricsUrl = line.replace(/^(Lyrics URL:|Link:)/, '').trim();
                continue;
            }
            if (line.startsWith('Send Midi Note(s):')) {
                const notesStr = line.replace('Send Midi Note(s):', '').trim();
                // Split by comma as per user request "C-1, G#-1"
                songMap.midiNotes = notesStr.split(',').map(n => n.trim()).filter(Boolean);
                continue;
            }

            // Parse Section Header: [Name | Chords]
            if (line.startsWith('[') && line.endsWith(']')) {
                if (currentSection) {
                    currentSection.lyrics = sectionLyrics.join('\n').trim();
                    songMap.sections.push(currentSection);
                }

                const headerContent = line.slice(1, -1);
                const parts = headerContent.split('|').map(p => p.trim());

                // Support both [Label | Chords] and legacy [Label | Bars | Chords]
                let label = parts[0] || 'Section';
                let chords = '';

                if (parts.length === 2) {
                    chords = parts[1];
                } else if (parts.length === 3) {
                    // Legacy: parts[1] was bars, parts[2] was chords
                    chords = parts[2];
                }

                currentSection = {
                    id: crypto.randomUUID(),
                    label,
                    chords,
                    lyrics: ''
                };
                sectionLyrics = [];
                continue;
            }

            if (currentSection) {
                sectionLyrics.push(line);
            }
        }

        if (currentSection) {
            currentSection.lyrics = sectionLyrics.join('\n').trim();
            songMap.sections.push(currentSection);
        }

        return songMap;
    }

    static stringify(map: SongMap): string {
        let output = `BPM: ${map.bpm}\n`;
        output += `Time: ${map.timeSignature}\n`;
        output += `Length: ${map.songLength}\n`;
        if (map.originalKey) {
            output += `Key: ${map.originalKey}\n`;
        }
        if (map.lyricsUrl) {
            output += `Lyrics URL: ${map.lyricsUrl}\n`;
        }
        if (map.midiNotes && map.midiNotes.length > 0) {
            output += `Send Midi Note(s): ${map.midiNotes.join(', ')}\n`;
        }
        output += `\n`;

        for (const section of map.sections) {
            output += `[${section.label} | ${section.chords}]\n`;
            if (section.lyrics) {
                output += section.lyrics + '\n';
            }
            output += '\n';
        }

        return output.trim();
    }
}
