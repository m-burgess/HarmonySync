import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroXMark, heroDocumentText, heroInformationCircle, heroSparkles, heroArrowPath } from '@ng-icons/heroicons/outline';
import { SongMap, SongMapModalData } from '../../../models/song-map.models';
import { SongMapParser } from '../../../utils/song-map-parser';
import { VSCodeModalComponent } from '../../vscode-ui/modal/modal.component';
import { ElectronService } from '../../../core/electron.service';

@Component({
    selector: 'app-song-map-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent, VSCodeModalComponent],
    providers: [
        provideIcons({ heroCheck, heroXMark, heroDocumentText, heroInformationCircle, heroSparkles, heroArrowPath })
    ],
    templateUrl: './song-map-modal.html',
    styleUrl: './song-map-modal.scss'
})
export class SongMapModalComponent implements OnInit {
    private electron = inject(ElectronService);

    // The master text editor content
    rawText = signal<string>('');

    constructor(
        public dialogRef: DialogRef<SongMap | null>,
        @Inject(DIALOG_DATA) public data: SongMapModalData
    ) { }

    ngOnInit() {
        if (this.data.existingMap) {
            this.rawText.set(SongMapParser.stringify(this.data.existingMap));
        } else {
            // Default template
            this.rawText.set(
                `BPM: 78\n` +
                `Time: 4/4\n` +
                `Length: 3:00\n` +
                `Key: C\n` +
                `Lyrics URL: \n\n` +
                `[Intro | 1-6m-5-4]\n\n` +
                `[Verse 1 | 1-6m-5-4]\n` +
                `Paste lyrics here...`
            );
        }
    }

    async save() {
        let text = this.rawText().trim();
        if (!text) return;

        try {
            let songMap = SongMapParser.parse(text);
            this.dialogRef.close(songMap);
        } catch (error) {
            console.error('Error parsing song map:', error);
            alert('Error parsing song map. Please check the format.');
        }
    }

    close() {
        this.dialogRef.close(null);
    }
}
