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
    isScraping = signal<boolean>(false);

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

            // AUTO-SCRAPE LOGIC:
            // If we have a URL but no substantial lyrics in sections
            const hasLyrics = songMap.sections.some(s => s.lyrics && s.lyrics.trim().length > 5);

            if (songMap.lyricsUrl && !hasLyrics) {
                this.isScraping.set(true);
                try {
                    const scrapedLyrics = await this.electron.invoke('lyrics:scrape', songMap.lyricsUrl);
                    if (scrapedLyrics) {
                        // Merge scraped lyrics into the current structure if possible, 
                        // or just append/replace based on sections.
                        // For simplicity and since Genius lyrics already contain sections, 
                        // we can replace the songMap sections with scraped ones.

                        const lines = scrapedLyrics.split('\n');
                        let currentLabel = 'Verse 1';
                        let currentLyrics: string[] = [];
                        songMap.sections = [];

                        for (let line of lines) {
                            line = line.trim();
                            if (line.startsWith('[') && line.endsWith(']')) {
                                if (currentLyrics.length > 0 || songMap.sections.length > 0) {
                                    // Close current section
                                    songMap.sections.push({
                                        id: crypto.randomUUID(),
                                        label: currentLabel,
                                        chords: '',
                                        lyrics: currentLyrics.join('\n').trim()
                                    });
                                }
                                currentLabel = line.slice(1, -1);
                                currentLyrics = [];
                            } else {
                                currentLyrics.push(line);
                            }
                        }

                        if (currentLyrics.length > 0 || currentLabel) {
                            songMap.sections.push({
                                id: crypto.randomUUID(),
                                label: currentLabel,
                                chords: '',
                                lyrics: currentLyrics.join('\n').trim()
                            });
                        }

                        // Update raw text so user can see it if they were to cancel/retry, 
                        // but we're about to close anyway.
                        this.rawText.set(SongMapParser.stringify(songMap));
                    }
                } catch (scrapeError) {
                    console.error('Failed to scrape lyrics:', scrapeError);
                    alert('Could not pull lyrics from the URL. Please check the link or paste manually.');
                    this.isScraping.set(false);
                    return; // Stop save so user can fix
                }
                this.isScraping.set(false);
            }

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
