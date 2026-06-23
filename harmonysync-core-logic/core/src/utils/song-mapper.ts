import { SongMap, SongSection } from '../models/song-map';

/**
 * SongMapper handles the legacy plain-text format [Label] \n Lyrics
 * XML parsing has been moved to the Go Media Engine for robustness.
 */
export class SongMapper {
    /**
     * Parses legacy plain-text song maps.
     * Format: 
     * [Verse 1]
     * Lyrics here...
     */
    static parse(content: string): SongMap {
        const songMap: SongMap = {
            bpm: 78,
            timeSignature: '4/4',
            songLength: '0:00',
            originalKey: 'C',
            sections: []
        };

        if (!content || !content.trim()) {
            return songMap;
        }

        // If it looks like XML, we shouldn't be parsing it here 
        // (Go engine handles XML now for file loading), but we'll 
        // provide a very basic fallback for the UI modal if it receives XML
        if (content.trim().startsWith('<song>')) {
            return this.parseBasicXML(content, songMap);
        }

        return this.parseLegacyText(content, songMap);
    }

    private static parseLegacyText(content: string, songMap: SongMap): SongMap {
        const lines = content.split('\n');
        let currentSection: SongSection | null = null;
        let sectionLyrics: string[] = [];

        for (let line of lines) {
            line = line.trim();
            if (!line && !currentSection) continue;

            if (line.startsWith('[') && line.endsWith(']')) {
                if (currentSection) {
                    currentSection.lyrics = sectionLyrics.join('\n').trim();
                    songMap.sections.push(currentSection);
                }

                const inner = line.slice(1, -1);
                const parts = inner.split('|');
                const label = parts[0].trim();
                const chords = parts.length > 1 ? parts[1].trim() : '';

                currentSection = {
                    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                    label,
                    chords,
                    lyrics: ''
                };
                sectionLyrics = [];
            } else {
                if (currentSection) {
                    sectionLyrics.push(line);
                }
            }
        }

        if (currentSection) {
            currentSection.lyrics = sectionLyrics.join('\n').trim();
            songMap.sections.push(currentSection);
        }

        return songMap;
    }

    private static parseBasicXML(content: string, songMap: SongMap): SongMap {
        // Very basic regex-based parsing just for UI modal support 
        // without fast-xml-parser. 
        // Real parsing is done in Go.
        try {
            const bpmMatch = content.match(/<bpm>(.*?)<\/bpm>/);
            if (bpmMatch) songMap.bpm = parseInt(bpmMatch[1], 10);

            const timingMatch = content.match(/<timing>(.*?)<\/timing>/);
            if (timingMatch) songMap.timeSignature = timingMatch[1];

            const lengthMatch = content.match(/<length>(.*?)<\/length>/);
            if (lengthMatch) songMap.songLength = lengthMatch[1];

            const keyMatch = content.match(/<key>(.*?)<\/key>/);
            if (keyMatch) songMap.originalKey = keyMatch[1];

            const midiNotesMatch = content.match(/<midiNotes>(.*?)<\/midiNotes>/);
            if (midiNotesMatch) {
                songMap.midiNotes = midiNotesMatch[1].split(',').map(n => n.trim());
            }

            // Extract parts (regex is primitive but enough for simple modal edits)
            const partRegex = /<part name="(.*?)">([\s\S]*?)<\/part>/g;
            let match;
            while ((match = partRegex.exec(content)) !== null) {
                const label = match[1];
                const inner = match[2];
                const chordsMatch = inner.match(/<chords>(.*?)<\/chords>/);
                const lyricsInnerMatch = inner.match(/<lyrics>([\s\S]*?)<\/lyrics>/);
                
                const lines: { text: string; timestamp?: string }[] = [];
                let lyricsText = '';

                if (lyricsInnerMatch) {
                    const lyricsInner = lyricsInnerMatch[1];
                    const lineRegex = /<line(?: timestamp="(.*?)")?>(.*?)<\/line>/g;
                    let lineMatch;
                    while ((lineMatch = lineRegex.exec(lyricsInner)) !== null) {
                        const timestamp = lineMatch[1];
                        const text = lineMatch[2];
                        lines.push({ text, timestamp });
                    }
                    
                    if (lines.length > 0) {
                        lyricsText = lines.map(l => l.text).join('\n');
                    } else {
                        lyricsText = lyricsInner.trim();
                    }
                }

                songMap.sections.push({
                    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                    label,
                    chords: chordsMatch ? chordsMatch[1].trim() : '',
                    lyrics: lyricsText,
                    lines: lines.length > 0 ? lines : undefined
                });
            }
        } catch (e) {
            console.warn('[SongMapper] Basic XML parse failed', e);
        }
        return songMap;
    }

    /**
     * Stringifies a SongMap into XML.
     */
    static stringify(map: SongMap, title: string = 'Untitled'): string {
        let xml = `<song>\n`;
        xml += `  <title>${title}</title>\n`;
        xml += `  <bpm>${map.bpm}</bpm>\n`;
        xml += `  <timing>${map.timeSignature}</timing>\n`;
        xml += `  <length>${map.songLength}</length>\n`;
        xml += `  <key>${map.originalKey || ''}</key>\n`;
        
        if (map.midiNotes && map.midiNotes.length > 0) {
            xml += `  <midiNotes>${map.midiNotes.join(', ')}</midiNotes>\n`;
        }

        map.sections.forEach(s => {
            xml += `  <part name="${s.label}">\n`;
            xml += `    <chords>${s.chords || ''}</chords>\n`;
            xml += `    <lyrics>\n`;
            if (s.lines && s.lines.length > 0) {
                s.lines.forEach(l => {
                    xml += `      <line timestamp="${l.timestamp || ''}">${l.text}</line>\n`;
                });
            } else {
                // Split by newline and wrap in lines if needed, or just raw
                const lines = (s.lyrics || '').split('\n');
                lines.forEach(line => {
                    xml += `      <line>${line}</line>\n`;
                });
            }
            xml += `    </lyrics>\n`;
            xml += `  </part>\n`;
        });

        xml += `</song>`;
        return xml;
    }
}
