import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../../core/electron.service';
import { ConfigService } from '../../../core/config.service';

@Component({
    selector: 'app-preservice-music',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './preservice-music.component.html',
    styleUrl: './preservice-music.component.scss'
})
export class PreServiceMusicComponent implements OnInit {
    private electron = inject(ElectronService);
    private config = inject(ConfigService);

    playlistUrl = signal<string>('');
    isSaving = signal<boolean>(false);

    ngOnInit() {
        this.loadConfig();
    }

    async loadConfig() {
        const settings = this.config.settings();
        if (settings && settings.preservicePlaylistUrl) {
            this.playlistUrl.set(settings.preservicePlaylistUrl);
        } else {
            // Fallback: reload from service just in case
            this.config.loadSettings().subscribe(s => {
                if (s?.preservicePlaylistUrl) {
                    this.playlistUrl.set(s.preservicePlaylistUrl);
                }
            });
        }
    }

    async saveUrl() {
        this.isSaving.set(true);
        try {
            await this.config.updateSettings({ preservicePlaylistUrl: this.playlistUrl() }).toPromise();
            console.log('Playlist URL saved');
        } catch (error) {
            console.error('Failed to save playlist URL:', error);
        } finally {
            this.isSaving.set(false);
        }
    }

    openInBrowser() {
        if (this.playlistUrl()) {
            this.electron.send('open-url-external', this.playlistUrl());
        }
    }

    closeWindow() {
        this.electron.send('window-control', { action: 'hide', type: 'preserviceMusic' });
    }
}
