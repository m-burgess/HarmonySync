import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMusicalNote } from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../../core/electron.service';

import { SongMap } from '../../../models/song-map.models';


interface ParsedLine {
    type: 'section' | 'lyric';
    text: string;
    originalIndex: number;
    section?: string;
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
        provideIcons({ heroMusicalNote })
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

    constructor(private electron: ElectronService) { }

    ngOnInit() { }

    ngOnDestroy() { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['lyrics']) {
            this.parseLyrics();
            this.selectedIndex = 0;
            this.emitSelection();
        }
    }

    private parseLyrics() {
        if (!this.lyrics) {
            this.parsedLines = [];
            this.lyricLines = [];
            return;
        }

        const lines: ParsedLine[] = [];
        let currentSection = 'Intro';
        const rawLines = this.lyrics.split(/\r?\n/);

        rawLines.forEach((line, idx) => {
            const trimmed = line.trim();
            const sectionMatch = trimmed.match(/^\[(.*)\]$/);

            if (sectionMatch) {
                currentSection = sectionMatch[1];
                lines.push({ type: 'section', text: currentSection, originalIndex: idx });
            } else if (trimmed.length > 0) {
                lines.push({ type: 'lyric', text: trimmed, section: currentSection, originalIndex: idx });
            }
        });

        this.parsedLines = lines;
        this.lyricLines = lines.filter((line): line is ParsedLine & { section: string } =>
            line.type === 'lyric' && line.section !== undefined
        );
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
