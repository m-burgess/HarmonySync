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
});
