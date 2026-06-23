import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener, signal, effect, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMusicalNote, heroPlay, heroStop } from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../../core/electron.service';
import { AudioService } from '../../../core/audio.service';

import { SongMap } from '@harmonysync/core';


interface ParsedLine {
    type: 'section' | 'lyric';
    text: string;
    originalIndex: number;
    section?: string;
    timestamp?: number;
}

export interface SelectionChangeData {
    lines: string[];
    section: string;
    index: number;
}

@Component({
    selector: 'app-lyrics-column',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    providers: [
        provideIcons({ heroMusicalNote, heroPlay, heroStop })
    ],
    templateUrl: './lyrics-column.html',
    styleUrl: './lyrics-column.scss'
})

export class LyricsColumnComponent implements OnInit, OnDestroy, OnChanges {
    @Input() lyrics: string | null = null;
    @Input() songMap: SongMap | null = null;
    @Output() onSelectionChange = new EventEmitter<SelectionChangeData>();

    selectedIndex = 0;

    hoveredIndex: number | null = null;
    parsedLines: ParsedLine[] = [];
    lyricLines: (ParsedLine & { section: string })[] = [];

    @ViewChild('columnRef') columnRef!: ElementRef;
    @ViewChild('selectedRef') selectedRef!: ElementRef;

    private audioService = inject(AudioService);
    private cdr = inject(ChangeDetectorRef);
    isAutoAdvanceEnabled = signal(false);
    hasTimestamps = signal(false);

    constructor(private electron: ElectronService) {
        effect(() => {
            const isEnabled = this.isAutoAdvanceEnabled();
            const pos = this.audioService.currentPosition();
            if (!isEnabled) return;
            
            // Push calculation to the next tick to prevent effect dependency issues and ensure CDR works
            setTimeout(() => {
                this.checkAutoAdvance(pos);
            });
        });
    }

    ngOnInit() { }

    ngOnDestroy() { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['lyrics'] || changes['songMap']) {
            this.parseLyrics();
            if (changes['lyrics']) {
                this.selectedIndex = 0;
            }
            this.emitSelection();
        }
    }

    private parseLyrics() {
        if (!this.lyrics) {
            this.parsedLines = [];
            this.lyricLines = [];
            this.hasTimestamps.set(false);
            this.isAutoAdvanceEnabled.set(false);
            return;
        }

        const lines: ParsedLine[] = [];
        let currentSection = 'Intro';
        const rawLines = this.lyrics.split(/\r?\n/);

        // Build a flat list of timestamps from songMap to match against rawLines
        const songMapTimestamps: { text: string, timestamp: number }[] = [];
        if (this.songMap && this.songMap.sections) {
            for (const sec of this.songMap.sections) {
                if (sec.lines) {
                    for (const l of sec.lines) {
                        if (l.timestamp && l.text.trim().length > 0) {
                            songMapTimestamps.push({
                                text: l.text.trim(),
                                timestamp: this.parseTimestampToSeconds(l.timestamp)
                            });
                        }
                    }
                }
            }
        }

        let mapIndex = 0;

        rawLines.forEach((line, idx) => {
            const trimmed = line.trim();
            const sectionMatch = trimmed.match(/^\[(.*)\]$/);

            if (sectionMatch) {
                const fullSection = sectionMatch[1];
                currentSection = fullSection.split('|')[0].trim();
                lines.push({ type: 'section', text: currentSection, originalIndex: idx });
            } else if (trimmed.length > 0) {
                let timestamp: number | undefined = undefined;

                if (mapIndex < songMapTimestamps.length) {
                    // Just map sequentially
                    timestamp = songMapTimestamps[mapIndex].timestamp;
                    mapIndex++;
                }

                lines.push({ type: 'lyric', text: trimmed, section: currentSection, originalIndex: idx, timestamp });
            }
        });

        this.parsedLines = lines;
        this.lyricLines = lines.filter((line): line is ParsedLine & { section: string } =>
            line.type === 'lyric' && line.section !== undefined
        );

        console.log('[AutoSync] Parsed lyricLines:', this.lyricLines.map(l => `${l.text} (${l.timestamp}s)`));

        const hasValidTimestamps = this.lyricLines.length > 0 && this.lyricLines.every(l => l.timestamp !== undefined);
        this.hasTimestamps.set(hasValidTimestamps);
        if (!hasValidTimestamps) {
            this.isAutoAdvanceEnabled.set(false);
        }
    }

    private parseTimestampToSeconds(timeStr: string): number {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        }
        return parseFloat(timeStr) || 0;
    }

    private checkAutoAdvance(currentPos: number) {
        if (!this.lyricLines.length || !this.hasTimestamps()) return;

        let targetIndex = 0;
        for (let i = 0; i < this.lyricLines.length; i += 2) {
            const line = this.lyricLines[i];
            const nextPairLine = this.lyricLines[i + 2];

            const startThreshold = line.timestamp !== undefined ? line.timestamp - 1.0 : 0;
            const endThreshold = nextPairLine && nextPairLine.timestamp !== undefined ? nextPairLine.timestamp - 1.0 : Infinity;

            if (currentPos >= startThreshold && currentPos < endThreshold) {
                targetIndex = i;
                break;
            }
        }

        if (this.selectedIndex !== targetIndex) {
            this.selectedIndex = targetIndex;
            this.cdr.detectChanges();
            this.emitSelection();
            this.scrollToSelected();
        }
    }

    toggleAutoAdvance() {
        if (this.hasTimestamps()) {
            this.isAutoAdvanceEnabled.update(v => !v);
        }
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(e: KeyboardEvent) {
        if (!this.lyricLines.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 2, Math.max(0, this.lyricLines.length - 2));
            this.emitSelection();
            this.scrollToSelected();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(0, this.selectedIndex - 2);
            this.emitSelection();
            this.scrollToSelected();
        }
    }

    handleLineClick(lyricIndex: number) {
        this.isAutoAdvanceEnabled.set(false);
        this.selectedIndex = Math.floor(lyricIndex / 2) * 2;
        this.emitSelection();
        this.scrollToSelected();
    }

    handleLineHover(lyricIndex: number) {
        this.hoveredIndex = Math.floor(lyricIndex / 2) * 2;
    }

    private emitSelection() {
        if (this.lyricLines.length > 0 && this.selectedIndex < this.lyricLines.length) {
            const line1 = this.lyricLines[this.selectedIndex];
            const line2 = this.lyricLines[this.selectedIndex + 1];

            const selectedText = [line1?.text || '', line2?.text || ''].filter(t => t.length > 0);
            const nextLines = this.selectedIndex + 2 < this.lyricLines.length
                ? [this.lyricLines[this.selectedIndex + 2]?.text || '', this.lyricLines[this.selectedIndex + 3]?.text || ''].filter(t => t.length > 0)
                : [];

            this.electron.emit('display-lyrics', { lines: selectedText });
            this.electron.emit('display-confidence-lyrics', {
                current: selectedText,
                next: nextLines,
                section: line1.section
            });

            this.electron.emit('set-lower-thirds-text', {
                line1: '',
                line2: selectedText.join('\n')
            });

            this.onSelectionChange.emit({
                lines: selectedText,
                section: line1.section,
                index: this.selectedIndex
            });
        }
    }

    private scrollToSelected() {
        setTimeout(() => {
            if (this.selectedRef) {
                this.selectedRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    getLineIndex(parsedLineIdx: number): number {
        let count = 0;
        for (let i = 0; i < parsedLineIdx; i++) {
            if (this.parsedLines[i].type === 'lyric') count++;
        }
        return count;
    }

    isInSelectedPair(lyricIdx: number): boolean {
        return lyricIdx === this.selectedIndex || lyricIdx === this.selectedIndex + 1;
    }

    isInHoveredPair(lyricIdx: number): boolean {
        return this.hoveredIndex !== null && (lyricIdx === this.hoveredIndex || lyricIdx === this.hoveredIndex + 1);
    }
}
