import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LyricsColumnComponent } from './lyrics-column.component';
import { ElectronService } from '../../../core/electron.service';
import { AudioService } from '../../../core/audio.service';
import { signal } from '@angular/core';

describe('LyricsColumnComponent Auto-Advance', () => {
    let component: LyricsColumnComponent;
    let fixture: ComponentFixture<LyricsColumnComponent>;
    let mockAudioService: any;
    let mockElectronService: any;

    beforeEach(async () => {
        mockAudioService = {
            currentPosition: signal(0)
        };

        mockElectronService = {
            emit: () => {},
            on: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [LyricsColumnComponent],
            providers: [
                { provide: AudioService, useValue: mockAudioService },
                { provide: ElectronService, useValue: mockElectronService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LyricsColumnComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should parse lyrics and timestamps correctly', () => {
        const testLyrics = `[Verse 1]
Line 1
Line 2
[Chorus]
Line 3
Line 4`;

        const testSongMap = {
            title: 'Test',
            bpm: 120,
            timing: '4/4',
            length: '3:00',
            originalKey: 'A',
            midiNotes: [],
            lyricsUrl: '',
            sections: [
                {
                    id: 'Verse_1',
                    label: 'Verse 1',
                    chords: '',
                    lyrics: 'Line 1\nLine 2',
                    lines: [
                        { text: 'Line 1', timestamp: '00:10.0' },
                        { text: 'Line 2', timestamp: '00:15.0' }
                    ]
                },
                {
                    id: 'Chorus',
                    label: 'Chorus',
                    chords: '',
                    lyrics: 'Line 3\nLine 4',
                    lines: [
                        { text: 'Line 3', timestamp: '00:20.0' },
                        { text: 'Line 4', timestamp: '00:25.0' }
                    ]
                }
            ]
        };

        component.lyrics = testLyrics;
        component.songMap = testSongMap as any;
        component.ngOnChanges({
            lyrics: { currentValue: testLyrics, previousValue: null, firstChange: true, isFirstChange: () => true },
            songMap: { currentValue: testSongMap, previousValue: null, firstChange: true, isFirstChange: () => true }
        });

        expect(component.lyricLines.length).toBe(4);
        expect(component.hasTimestamps()).toBe(true);
        expect(component.lyricLines[0].timestamp).toBe(10);
        expect(component.lyricLines[1].timestamp).toBe(15);
        expect(component.lyricLines[2].timestamp).toBe(20);
        expect(component.lyricLines[3].timestamp).toBe(25);
    });

    it('should calculate targetIndex correctly in checkAutoAdvance', () => {
        component.lyricLines = [
            { type: 'lyric', text: 'Line 1', originalIndex: 1, section: 'V1', timestamp: 10 },
            { type: 'lyric', text: 'Line 2', originalIndex: 2, section: 'V1', timestamp: 15 },
            { type: 'lyric', text: 'Line 3', originalIndex: 4, section: 'C', timestamp: 25 },
            { type: 'lyric', text: 'Line 4', originalIndex: 5, section: 'C', timestamp: 30 }
        ];
        component.hasTimestamps.set(true);
        component.isAutoAdvanceEnabled.set(true);

        (component as any).checkAutoAdvance(0);
        expect(component.selectedIndex).toBe(0);

        (component as any).checkAutoAdvance(8);
        expect(component.selectedIndex).toBe(0);

        (component as any).checkAutoAdvance(9);
        expect(component.selectedIndex).toBe(0);

        (component as any).checkAutoAdvance(23);
        expect(component.selectedIndex).toBe(0);

        (component as any).checkAutoAdvance(24);
        expect(component.selectedIndex).toBe(2);

        (component as any).checkAutoAdvance(35);
        expect(component.selectedIndex).toBe(2);
    });
});
