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
    lyrics: string;
    chords: string;
    bars: number;
}

export interface SongMap {
    bpm: number;
    songLength: string; // e.g., "3:41"
    timeSignature: string; // e.g., "4/4"
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
    bpm = signal<number>(120);
    songLength = signal<string>('3:00');
    timeSignature = signal<string>('4/4');

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
            this.sequence.set(this.data.existingMap.sections.map(s => ({ ...s })));
        }
    }

    addSection(label: string) {
        const id = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSection: SongSection = {
            id,
            label,
            lyrics: '',
            chords: '',
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
        const [beatsPerBar] = this.timeSignature().split('/').map(val => parseInt(val, 10) || 0);

        if (totalSeconds === 0 || this.bpm() === 0 || beatsPerBar === 0) return 0;

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
        const barsPerSection = Math.floor(expected / count);
        const remainder = expected % count;

        this.sequence.update(s => {
            return s.map((section, i) => ({
                ...section,
                // Add the remainder bars to the last section
                bars: i === count - 1 ? barsPerSection + remainder : barsPerSection
            }));
        });
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
            sections: this.sequence()
        };

        this.dialogRef.close(songMap);
    }

    close() {
        this.dialogRef.close(null);
    }
}
