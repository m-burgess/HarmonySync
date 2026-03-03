import { SermonParser } from '../src/utils/sermon-parser';

describe('SermonParser', () => {
    const sampleContent = `
---
youtube: https://youtube.com/live/123
midi: C-1, G-1
[OpeningSong: 60, 61]
[SlideA.png: 62]
---

[Genesis 1:1]
In the beginning God created the heavens and the earth.

[timer: 05:00 | target: confidence]
[youtube]
https://youtube.com/watch?v=abc
`;

    it('should parse global header correctly', () => {
        const result = SermonParser.parse(sampleContent);
        expect(result.manifest.youtube).toBe('https://youtube.com/live/123');
        expect(result.manifest.midi).toEqual(['C-1', 'G-1']);
        expect(result.manifest.folderMidi?.['OpeningSong']).toEqual(['60', '61']);
        expect(result.manifest.slideMidi?.['SlideA.png']).toEqual(['62']);
    });

    it('should parse targeted timers correctly', () => {
        const result = SermonParser.parse(sampleContent);
        const timerSlide = result.slides.find(s => s.action?.timer === '05:00');
        expect(timerSlide).toBeDefined();
        expect(timerSlide?.action?.targets).toEqual(['confidence']);
    });

    it('should support slide-specific MIDI from manifest', () => {
        const contentWithSlide = `
---
[SlideA.png: 62]
---
[SlideA.png]
Content here
`;
        const result = SermonParser.parse(contentWithSlide);
        expect(result.slides[0].action?.midi).toEqual(['62']);
    });
});
