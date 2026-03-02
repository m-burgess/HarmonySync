import { SongMap, SongSection } from '../models/song-map.models';

export class SongMapParser {
    /**
     * Parses a standardized lyrics.txt string into a SongMap object.
     */
    static parse(content: string): SongMap {
        const lines = content.split('\n');
        const songMap: SongMap = {
            bpm: 120,
            timeSignature: '4/4',
            songLength: '0:00',
            sections: []
        };

        // Check if this is a "Map" file or just legacy lyrics
        const isMap = content.includes('BPM:') || content.includes('Time:') || content.includes('[');

        if (!isMap) {
            // Legacy plain text: wrap everything in a single "Verse" section
            songMap.sections.push({
                id: crypto.randomUUID(),
                label: 'Verse 1',
                bars: 0,
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

            // Parse metadata
            if (line.startsWith('BPM:')) {
                songMap.bpm = parseInt(line.replace('BPM:', '').trim(), 10) || 120;
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

            // Parse Section Header: [Name | Bars | Chords]
            if (line.startsWith('[') && line.endsWith(']')) {
                // Save previous section if exists
                if (currentSection) {
                    currentSection.lyrics = sectionLyrics.join('\n');
                    songMap.sections.push(currentSection);
                }

                const content = line.slice(1, -1);
                const parts = content.split('|').map(p => p.trim());

                const label = parts[0] || 'Section';
                const bars = parts[1] ? parseInt(parts[1].replace('bars', '').trim(), 10) || 4 : 4;
                const chords = parts[2] || '';

                currentSection = {
                    id: crypto.randomUUID(),
                    label,
                    bars,
                    chords,
                    lyrics: ''
                };
                sectionLyrics = [];
                continue;
            }

            // Append lyrics to current section
            if (currentSection) {
                sectionLyrics.push(line);
            }
        }

        // Push final section
        if (currentSection) {
            currentSection.lyrics = sectionLyrics.join('\n');
            songMap.sections.push(currentSection);
        }

        return songMap;
    }

    /**
     * Converts a SongMap object into a standardized lyrics.txt string.
     */
    static stringify(map: SongMap): string {
        let output = `BPM: ${map.bpm}\n`;
        output += `Time: ${map.timeSignature}\n`;
        output += `Length: ${map.songLength}\n\n`;

        for (const section of map.sections) {
            output += `[${section.label} | ${section.bars} bars | ${section.chords}]\n`;
            if (section.lyrics) {
                output += section.lyrics + '\n';
            }
            output += '\n';
        }

        return output.trim();
    }
}
