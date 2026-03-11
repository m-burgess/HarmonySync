import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroXMark, heroDocumentText, heroInformationCircle, heroSparkles, heroArrowPath } from '@ng-icons/heroicons/outline';
import { SongMapModalData } from '../../../models/song-map.models';
import { SongMap, SongMapper } from '@harmonysync/core';
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
            this.rawText.set(SongMapper.stringify(this.data.existingMap, this.data.songName));
        } else {
            // Default XML template
            this.rawText.set(
                `<song>\n` +
                `  <title>${this.data.songName || 'Untitled'}</title>\n` +
                `  <bpm>78</bpm>\n` +
                `  <timing>4/4</timing>\n` +
                `  <length>3:00</length>\n` +
                `  <key>C</key>\n` +
                `  <lyricsURL></lyricsURL>\n` +
                `  <part name="Intro">\n` +
                `    <chords>1-6m-5-4</chords>\n` +
                `    <lyrics></lyrics>\n` +
                `  </part>\n` +
                `  <part name="Verse 1">\n` +
                `    <chords>1-6m-5-4</chords>\n` +
                `    <lyrics>Paste lyrics here...</lyrics>\n` +
                `  </part>\n` +
                `</song>`
            );
        }
    }

    async save() {
        let text = this.rawText().trim();
        if (!text) return;

        try {
            let songMap = SongMapper.parse(text);
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
