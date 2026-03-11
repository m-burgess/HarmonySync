import { ServiceMapper } from '../src/utils/service-mapper';

describe('ServiceMapper', () => {
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
        const result = ServiceMapper.parse(sampleContent);
        expect(result.manifest.youtube).toBe('https://youtube.com/live/123');
        expect(result.manifest.midi).toEqual(['C-1', 'G-1']);
        expect(result.manifest.folderMidi?.['OpeningSong']).toEqual({ midi: ['60', '61'] });
        expect(result.manifest.slideMidi?.['SlideA.png']).toEqual({ midi: ['62'] });
    });

    it('should parse targeted timers correctly', () => {
        const result = ServiceMapper.parse(sampleContent);
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
        const result = ServiceMapper.parse(contentWithSlide);
        expect(result.slides[0].action?.midi).toEqual(['62']);
    });

    it('should parse XML-based configurations correctly', () => {
        const xmlContent = `
        <serviceOrder>
          <playlist url="https://youtube.com/playlist?list=PL12345">
            <service name="morning" start="8:30AM" end="8:55AM" />
          </playlist>
          <canva url="https://canva.com/something" />
          <item name="Filename.png">
            <midi>A-4, B-4</midi>
            <timer>05:00</timer>
            <timerTarget>audience, confidence</timerTarget>
            <autoAdvanceWhenComplete>true</autoAdvanceWhenComplete>
          </item>
          <item name="Countdown.mp4" start="8:25AM" end="8:30AM" />
        </serviceOrder>
        `;

        const result = ServiceMapper.parse(xmlContent);

        // Check global properties
        expect(result.manifest.music?.playlist).toBe('https://youtube.com/playlist?list=PL12345');
        expect(result.manifest.music?.start).toBe('8:30AM');
        expect(result.manifest.music?.end).toBe('8:55AM');
        expect(result.manifest.canva).toBe('https://canva.com/something');

        // Check item properties
        const itemConfig: any = result.manifest.slideMidi?.['Filename.png'];
        expect(itemConfig).toBeDefined();
        expect(itemConfig.midi).toEqual(['A-4', 'B-4']);
        expect(itemConfig.timer).toBe('05:00');
        expect(itemConfig.timerTarget).toEqual(['audience', 'confidence']);
        expect(itemConfig.autoAdvanceWhenComplete).toBe(true);
        expect(result.manifest.autoStartNextItem).toBe(true);

        const countdownConfig: any = result.manifest.slideMidi?.['Countdown.mp4'];
        expect(countdownConfig).toBeDefined();
        expect(countdownConfig.startTime).toBe('8:25AM');
        expect(countdownConfig.endTime).toBe('8:30AM');
    });
});
