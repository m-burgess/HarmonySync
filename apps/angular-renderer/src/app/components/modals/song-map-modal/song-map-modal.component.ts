import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash, heroCheck, heroXMark, heroBars3, heroSparkles } from '@ng-icons/heroicons/outline';


export interface SongSection {
    id: string;
    label: string;
    content: string; // ChordPro format: Chords in [brackets]
    bars: number;

    // Legacy support for migration
    lyrics?: string;
    chords?: string;
}

export interface SongMap {
    bpm: number;
    songLength: string; // e.g., "3:41"
    timeSignature: string; // e.g., "4/4"
    originalKey: string; // Added for ChordPro transposition
    sections: SongSection[];
}

export interface SongMapModalData {
    songName: string;
    songPath: string;
    existingMap?: SongMap;
}

import { VSCodeModalComponent } from '../../vscode-ui/modal/modal.component';

@Component({
    selector: 'app-song-map-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule, NgIconComponent, VSCodeModalComponent],
    providers: [
        provideIcons({ heroPlus, heroTrash, heroCheck, heroXMark, heroBars3, heroSparkles })
    ],
    templateUrl: './song-map-modal.html',
    styleUrl: './song-map-modal.scss'
})
export class SongMapModalComponent implements OnInit {
    // Song metadata
    bpm = signal<number>(78);
    songLength = signal<string>('0:00');
    timeSignature = signal<string>('4/4');
    originalKey = signal<string>('C');

    // Available labels to pick from (based on screenshot)
    availableLabels = [
        { label: 'Intro', numbers: [] },
        { label: 'Verse', numbers: [1, 2, 3, 4] },
        { label: 'Chorus', numbers: [1, 2, 3] },
        { label: 'Bridge', numbers: [] },
        { label: 'Vamp', numbers: [1, 2] },
        { label: 'Outro', numbers: [] },
        { label: 'Ending', numbers: [1, 2] },
        { label: 'Instrumental', numbers: [] },
        { label: 'Interlude', numbers: [] },
        { label: 'Tag', numbers: [] },
        { label: 'Turnaround', numbers: [] },
        { label: 'Refrain', numbers: [1, 2] },
        { label: 'PreChorus', numbers: [] },
        { label: 'Post-Chorus', numbers: [1, 2] },
        { label: 'Breakdown', numbers: [] }
    ];

    customNewLabel = signal<string>('');

    // The sequence of sections in the song
    sequence = signal<SongSection[]>([]);

    selectedSectionIndex = signal<number>(-1);

    constructor(
        public dialogRef: DialogRef<SongMap | null>,
        @Inject(DIALOG_DATA) public data: SongMapModalData
    ) { }

    ngOnInit() {
        if (this.data.existingMap) {
            this.bpm.set(this.data.existingMap.bpm);
            this.songLength.set(this.data.existingMap.songLength);
            this.timeSignature.set(this.data.existingMap.timeSignature);
            this.originalKey.set(this.data.existingMap.originalKey || 'C');

            // Migrate old sections to ChordPro content
            const migratedSections = this.data.existingMap.sections.map(s => {
                const updated = { ...s };
                if (!updated.content && (updated.lyrics || updated.chords)) {
                    // Primitive migration: If chords exist, put them at start as a hint?
                    // Better: If we have separate fields, we can't easily merge without knowing line positions.
                    // For now, just put chords in brackets if possible, or just append.
                    const chordLine = updated.chords ? `[${updated.chords.split('-').join('][')}]` : '';
                    updated.content = chordLine + (chordLine ? '\n' : '') + updated.lyrics;
                }
                return updated as SongSection;
            });
            this.sequence.set(migratedSections);
        }
    }

    addSection(label: string) {
        const id = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSection: SongSection = {
            id,
            label,
            content: '',
            bars: 8 // Default
        };
        this.sequence.update(s => [...s, newSection]);
        if (this.selectedSectionIndex() === -1) {
            this.selectedSectionIndex.set(this.sequence().length - 1);
        }
    }

    addCustomLabel() {
        const label = this.customNewLabel().trim();
        if (label) {
            this.addSection(label);
            this.customNewLabel.set('');
        }
    }

    removeSection(index: number, event: Event) {
        event.stopPropagation();
        this.sequence.update(s => {
            const updated = [...s];
            updated.splice(index, 1);
            return updated;
        });
        if (this.selectedSectionIndex() === index) {
            this.selectedSectionIndex.set(-1);
        } else if (this.selectedSectionIndex() > index) {
            this.selectedSectionIndex.update(i => i - 1);
        }
    }

    selectSection(index: number) {
        this.selectedSectionIndex.set(index);
    }

    drop(event: CdkDragDrop<SongSection[]>) {
        const sequence = [...this.sequence()];
        moveItemInArray(sequence, event.previousIndex, event.currentIndex);
        this.sequence.set(sequence);

        // Maintain selection
        if (this.selectedSectionIndex() === event.previousIndex) {
            this.selectedSectionIndex.set(event.currentIndex);
        } else if (
            event.previousIndex < this.selectedSectionIndex() &&
            event.currentIndex >= this.selectedSectionIndex()
        ) {
            this.selectedSectionIndex.update(i => i - 1);
        } else if (
            event.previousIndex > this.selectedSectionIndex() &&
            event.currentIndex <= this.selectedSectionIndex()
        ) {
            this.selectedSectionIndex.update(i => i + 1);
        }
    }

    get totalBars(): number {
        return this.sequence().reduce((sum, s) => sum + s.bars, 0);
    }

    get expectedBars(): number {
        const [min, sec] = this.songLength().split(':').map(val => parseInt(val, 10) || 0);
        const totalSeconds = (min * 60) + sec;
        const [num, den] = this.timeSignature().split('/').map(val => parseInt(val, 10) || 4);

        if (totalSeconds === 0 || this.bpm() === 0 || num === 0) return 0;

        // For /8 time signatures (6/8, 12/8), BPM usually refers to the dotted quarter (conductor's beat)
        const beatsPerBar = den === 8 ? num / 3 : num;

        const totalBeats = (totalSeconds * this.bpm()) / 60;
        return Math.round(totalBeats / beatsPerBar);
    }

    get remainingBars(): number {
        return this.expectedBars - this.totalBars;
    }

    fillRemaining() {
        const index = this.selectedSectionIndex();
        if (index === -1) return;

        const remaining = this.remainingBars;
        const currentBars = this.sequence()[index].bars;

        // Add remaining bars to the selected section
        this.sequence.update(s => {
            const updated = [...s];
            updated[index] = { ...updated[index], bars: Math.max(1, currentBars + remaining) };
            return updated;
        });
    }

    distributeEvenly() {
        const count = this.sequence().length;
        if (count === 0) return;

        const expected = this.expectedBars;
        const [num, den] = this.timeSignature().split('/').map(val => parseInt(val, 10) || 4);

        // alignment based on user feedback and common worship music patterns
        let alignment = 4;
        if (num === 3 && den === 4) {
            alignment = 6; // User requested 6, 12, 24 for 3/4
        } else if (den === 8) {
            alignment = 4; // 6/8 and 12/8 phrases are typically 4 or 8 bars
        }

        // 1. Assign base bars based on section type (Modern Worship Patterns)
        const baseBars = this.sequence().map(section => {
            const label = section.label.toLowerCase();
            if (label.includes('verse') || label.includes('chorus') || label.includes('refrain')) {
                return 8;
            }
            if (label.includes('bridge')) {
                return 16;
            }
            if (label.includes('intro') || label.includes('outro') || label.includes('ending') ||
                label.includes('vamp') || label.includes('instrumental') || label.includes('interlude') ||
                label.includes('tag') || label.includes('turnaround') || label.includes('pre') ||
                label.includes('post') || label.includes('breakdown')) {
                return 4;
            }
            return 8; // Default
        });

        const totalBase = baseBars.reduce((a, b) => a + b, 0);

        // 2. Scale and align
        const scaleFactor = expected / totalBase;
        let distributedTotal = 0;

        const nextSequence = this.sequence().map((section, i) => {
            let targetBars = baseBars[i] * scaleFactor;

            // Align to worship patterns (multiples of 4 or 3)
            // But ensure at least one 'alignment' unit
            targetBars = Math.max(alignment, Math.round(targetBars / alignment) * alignment);

            distributedTotal += targetBars;
            return { ...section, bars: targetBars };
        });

        // 3. Fix remainder by adjusting the longest section (usually Verse or Bridge)
        // or just the last section if everything else fails.
        let diff = expected - distributedTotal;
        if (diff !== 0) {
            // Find a suitable section to absorb the difference (multiples of alignment)
            // If diff is not a multiple of alignment, we just apply it to the last one anyway to satisfy total
            const indexToAdjust = nextSequence.length - 1;
            nextSequence[indexToAdjust].bars = Math.max(alignment, nextSequence[indexToAdjust].bars + diff);
        }

        this.sequence.set(nextSequence);
    }

    get isValid(): boolean {
        return this.totalBars > 0 && this.totalBars === this.expectedBars;
    }

    save() {
        if (!this.isValid) return;

        const songMap: SongMap = {
            bpm: this.bpm(),
            songLength: this.songLength(),
            timeSignature: this.timeSignature(),
            originalKey: this.originalKey(),
            sections: this.sequence()
        };

        this.dialogRef.close(songMap);
    }

    close() {
        this.dialogRef.close(null);
    }

    importFromText() {
        const input = prompt('Paste your chord sheet text (chords above lyrics):');
        if (!input) return;

        const lines = input.split('\n');
        const result: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            const nextLine = lines[i + 1] || '';

            // Heuristic to detect chord line: contains mostly chord symbols and spaces
            const isChordLine = (line: string) => {
                const words = line.trim().split(/\s+/);
                if (words.length === 0) return false;
                // Check if most words look like chords (A-G with accidental/extension)
                const chordRegex = /^[A-G](b|#)?(maj|min|m|sus|dim|aug|add)?\d?(\/[A-G](b|#)?)?$/i;
                const chordCount = words.filter(w => chordRegex.test(w)).length;
                return chordCount > 0 && chordCount >= words.length * 0.5;
            };

            if (isChordLine(currentLine) && nextLine.trim() && !isChordLine(nextLine)) {
                // Merge currentLine (chords) into nextLine (lyrics)
                let mergedLine = '';
                let lastPos = 0;

                // Find chords and their positions
                const chordMatches: { chord: string, pos: number }[] = [];
                const regex = /\S+/g;
                let match;
                while ((match = regex.exec(currentLine)) !== null) {
                    chordMatches.push({ chord: match[0], pos: match.index });
                }

                // Insert chords into lyrics at corresponding positions
                let currentLyrics = nextLine;
                let offset = 0;
                chordMatches.forEach(m => {
                    const pos = Math.min(m.pos + offset, currentLyrics.length);
                    currentLyrics = currentLyrics.slice(0, pos) + `[${m.chord}]` + currentLyrics.slice(pos);
                    offset += m.chord.length + 2;
                });

                result.push(currentLyrics);
                i++; // Skip nextLine as we merged it
            } else {
                result.push(currentLine);
            }
        }

        const index = this.selectedSectionIndex();
        if (index !== -1) {
            this.sequence.update(s => {
                const updated = [...s];
                updated[index].content = result.join('\n');
                return updated;
            });
        }
    }
}
