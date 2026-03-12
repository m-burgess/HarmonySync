import { SongMapper } from '../src/utils/song-mapper';

describe('SongMapper XML', () => {
    const sampleContent = `
<song>
  <title>My Jesus</title>
  <bpm>78</bpm>
  <timing>4/4</timing>
  <length>3:00</length>
  <key>C</key>
  <lyricsURL></lyricsURL>
  <midiNotes>C-1, G-1</midiNotes>
  <part name="Intro">
    <chords>1-6m-5-4</chords>
    <lyrics></lyrics>
  </part>
  <part name="Verse">
    <chords>1-6m-5-4</chords>
    <lyrics>Paste lyrics here...</lyrics>
  </part>
  <part name="Chorus">
    <chords>1-6m-5-4</chords>
    <lyrics>Paste lyrics here...</lyrics>
  </part>
</song>
`;

    it('should parse XML-based configurations correctly', () => {
        const result = SongMapper.parse(sampleContent);

        // Check global properties
        expect(result.bpm).toBe(78);
        expect(result.timeSignature).toBe('4/4');
        expect(result.songLength).toBe('3:00');
        expect(result.originalKey).toBe('C');
        expect(result.midiNotes).toEqual(['C-1', 'G-1']);
        
        // Check sections
        expect(result.sections.length).toBe(3);
        
        expect(result.sections[0].label).toBe('Intro');
        expect(result.sections[0].chords).toBe('1-6m-5-4');
        expect(result.sections[0].lyrics).toBe('');

        expect(result.sections[1].label).toBe('Verse');
        expect(result.sections[1].chords).toBe('1-6m-5-4');
        expect(result.sections[1].lyrics).toBe('Paste lyrics here...');

        expect(result.sections[2].label).toBe('Chorus');
        expect(result.sections[2].chords).toBe('1-6m-5-4');
        expect(result.sections[2].lyrics).toBe('Paste lyrics here...');
    });

    it('should generate XML from SongMap correctly', () => {
        const result = SongMapper.parse(sampleContent);
        const xml = SongMapper.stringify(result, 'My Jesus');
        // Ensure stringify preserves the part tags correctly formatted
        expect(xml).toContain('<part name="Intro">');
        expect(xml).toContain('<title>My Jesus</title>');
        expect(xml).toContain('<midiNotes>C-1, G-1</midiNotes>');
    });

    it('should parse granular timestamps in lyrics correctly', () => {
        const timestampedContent = `
<song>
  <part name="Automation Verse">
    <lyrics>
      <line timestamp="00:05">Line 1</line>
      <line timestamp="00:15">Line 2</line>
    </lyrics>
  </part>
</song>
`;
        const result = SongMapper.parse(timestampedContent);
        expect(result.sections.length).toBe(1);
        const section = result.sections[0];
        expect(section.label).toBe('Automation Verse');
        expect(section.lines).toBeDefined();
        expect(section.lines!.length).toBe(2);
        expect(section.lines![0].text).toBe('Line 1');
        expect(section.lines![0].timestamp).toBe('00:05');
        expect(section.lines![1].text).toBe('Line 2');
        expect(section.lines![1].timestamp).toBe('00:15');
        
        // Backward compatibility: lyrics field should be populated
        expect(section.lyrics).toBe('Line 1\nLine 2');
    });

    it('should stringify granular timestamps correctly', () => {
        const map = {
            bpm: 120,
            timeSignature: '4/4',
            songLength: '4:00',
            sections: [{
                id: '1',
                label: 'Verse 1',
                chords: '1-4-5',
                lyrics: 'L1\nL2',
                lines: [
                    { text: 'L1', timestamp: '00:00' },
                    { text: 'L2', timestamp: '00:10' }
                ]
            }]
        };

        const xml = SongMapper.stringify(map as any, 'Timestamp Test');
        expect(xml).toContain('<line timestamp="00:00">L1</line>');
        expect(xml).toContain('<line timestamp="00:10">L2</line>');
    });
});
