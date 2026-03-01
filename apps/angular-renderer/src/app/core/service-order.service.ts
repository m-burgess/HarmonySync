import { Injectable, inject, signal, computed } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { AudioService } from './audio.service';
import { SlideService } from './slide.service';
import { FileService } from './file.service';
import { ConfigService } from './config.service';
import { MessagingService } from './messaging.service';
import { EVENT_TYPES } from '../models/messaging.models';
import { SongMap } from '../models/song-map.models';
import { Dialog } from '@angular/cdk/dialog';


export interface ServiceOrderItem {
    id?: string;
    name: string;
    path: string;
    type: 'song' | 'folder' | 'presentation';
    tracks?: any[];
    lyrics?: string;
    songMap?: SongMap;
    hasAudio?: boolean;

    audioFileCount?: number;
    files?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ServiceOrderService {
    private electron = inject(ElectronService);
    private audio = inject(AudioService);
    private slideService = inject(SlideService);
    private fileService = inject(FileService);
    private config = inject(ConfigService);
    private messaging = inject(MessagingService);
    private dialog = inject(Dialog);

    // Reactive state
    readonly serviceOrder = signal<ServiceOrderItem[]>([]);
    readonly currentSongIndex = signal<number>(-1);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);
    readonly autoplayEnabled = signal<boolean>(false);

    // Derived state
    readonly hasSongs = computed(() => this.serviceOrder().length > 0);
    readonly currentSong = computed(() => {
        const index = this.currentSongIndex();
        const order = this.serviceOrder();
        return index >= 0 && index < order.length ? order[index] : null;
    });

    constructor() {
        // Listen for service-order-loaded event from Electron
        this.electron.on('service-order-loaded', (data: { serviceOrder: ServiceOrderItem[] }) => {
            if (data && data.serviceOrder) {
                this.serviceOrder.set(data.serviceOrder);
                this.currentSongIndex.set(-1); // Reset index on new list
            }
        });

        this.electron.on('video-ended', () => {
            const settings = this.config.settings();
            if (settings?.serviceOrder?.advanceOnVideoEnd) {
                console.log('[ServiceOrder] Video ended, advancing because advanceOnVideoEnd is true');
                this.advanceToNext();
            }
        });

        this.messaging.subscribe<any>(EVENT_TYPES.AUDIO_PLAYBACK_FINISHED).subscribe(() => {
            const settings = this.config.settings();
            if (settings?.serviceOrder?.advanceOnVideoEnd) {
                console.log('[ServiceOrder] Audio finished, advancing because advanceOnVideoEnd is true');
                this.advanceToNext();
            }
        });

        // Initialize watch folder if configured
        setTimeout(() => this.initWatchFolder(), 2000);
    }

    initWatchFolder(): void {
        const settings = this.config.settings();
        if (!settings?.serviceOrder?.watchFolder) return;

        const watchFolder = settings.serviceOrder.watchFolder;
        console.log(`[ServiceOrder] Initializing watch folder scanning: ${watchFolder}`);

        // Initial scan
        this.scanWatchFolder(watchFolder);

        // Setup polling every 30 seconds for new zips
        setInterval(() => this.scanWatchFolder(watchFolder), 30000);
    }

    private scanWatchFolder(path: string): void {
        this.electron.invoke('service-order:scanForZips', path).then((res: any) => {
            if (res.success && res.zips && res.zips.length > 0) {
                console.log(`[ServiceOrder] Found ${res.zips.length} zips in watch folder`);
                for (const zipPath of res.zips) {
                    this.importZip(zipPath);
                }
            }
        });
    }

    private importZip(zipPath: string): void {
        console.log(`[ServiceOrder] Importing zip: ${zipPath}`);
        this.electron.invoke('service-order:importZip', zipPath).then((res: any) => {
            if (res.success && res.metadata) {
                console.log(`[ServiceOrder] Import successful: ${res.metadata.name}`);
                // Load the imported service order
                this.electron.invoke('service-order:load', res.metadata.id);
            }
        });
    }

    toggleAutoplay(): void {
        this.autoplayEnabled.update(v => !v);
    }

    async addFolders(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);

        this.fileService.selectFolders('Add Folders to Service Order').subscribe({
            next: async (filePaths) => {
                if (!filePaths || filePaths.length === 0) {
                    this.isLoading.set(false);
                    return;
                }

                for (const folderPath of filePaths) {
                    // Check if already in service order
                    if (this.serviceOrder().some(item => item.path === folderPath)) {
                        continue;
                    }

                    // Load metadata
                    const metadata = await this.electron.invoke('service-order:loadSongMetadata', folderPath);

                    this.serviceOrder.update(order => [...order, metadata]);

                    // Auto-preload if it's a song
                    if (metadata.type === 'song' && metadata.hasAudio) {
                        this.preloadSong(metadata);
                    }
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to add folders:', err);
                this.error.set(err instanceof Error ? err.message : String(err));
                this.isLoading.set(false);
            }
        });
    }

    async preloadSong(item: ServiceOrderItem): Promise<void> {
        if (item.type !== 'song') return;

        const songId = item.id || item.path.split(/[\\/]/).filter(Boolean).pop() || 'song';

        // Get audio files in folder
        this.fileService.readDir(item.path).subscribe({
            next: (fileNames) => {
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
                const sep = item.path.includes('/') ? '/' : '\\';
                const audioFiles = fileNames
                    .filter((f: string) => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)))
                    .map((f: string) => `${item.path}${sep}${f}`);

                if (audioFiles.length > 0) {
                    this.audio.preloadSong(songId, audioFiles).subscribe({
                        next: () => console.log(`✓ Preloaded ${item.name}`),
                        error: (err) => console.error(`Failed to preload ${item.name}:`, err)
                    });
                }
            },
            error: (err) => console.error('Failed to read folder for preload:', err)
        });
    }

    removeItem(item: ServiceOrderItem): void {
        this.serviceOrder.update(order => order.filter(i => i.path !== item.path));

        // Adjust current index
        const index = this.serviceOrder().findIndex(i => i.path === item.path);
        if (this.currentSongIndex() >= index) {
            this.currentSongIndex.update(idx => Math.max(-1, idx - 1));
        }
    }

    reorderItems(fromIndex: number, toIndex: number): void {
        const order = [...this.serviceOrder()];
        const [item] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, item);
        this.serviceOrder.set(order);

        // Update current index
        if (this.currentSongIndex() === fromIndex) {
            this.currentSongIndex.set(toIndex);
        } else if (fromIndex < this.currentSongIndex() && toIndex >= this.currentSongIndex()) {
            this.currentSongIndex.update(idx => idx - 1);
        } else if (fromIndex > this.currentSongIndex() && toIndex <= this.currentSongIndex()) {
            this.currentSongIndex.update(idx => idx + 1);
        }
    }

    async loadItem(item: ServiceOrderItem, index: number): Promise<void> {
        this.currentSongIndex.set(index);
        this.isLoading.set(true);

        try {
            // 1. Tell audio engine to load tracks (and set as active)
            if (item.type === 'song') {
                this.audio.loadTracks(item.path).subscribe();
            }

            // 2. Load song map if available, otherwise fallback to lyrics.txt
            const songMap = await this.electron.invoke('service-order:loadSongMap', item.path);
            if (songMap) {
                this.serviceOrder.update(order => order.map(i => i.path === item.path ? { ...i, songMap } : i));
                // Generate lyrics from song map for display
                const lyrics = this.generateLyricsFromMap(songMap);
                this.serviceOrder.update(order => order.map(i => i.path === item.path ? { ...i, lyrics } : i));
            } else {
                const lyrics = await this.electron.invoke('service-order:loadLyrics', item.path);
                if (lyrics) {
                    this.serviceOrder.update(order => order.map(i => i.path === item.path ? { ...i, lyrics } : i));
                }
            }

            // 3. Trigger slide loading
            this.slideService.loadFromFolder(item.path).subscribe();

        } catch (err) {
            console.error('Failed to load item:', err);
            this.error.set(err instanceof Error ? err.message : String(err));
        } finally {
            this.isLoading.set(false);
        }
    }

    async advanceToNext(): Promise<void> {
        const index = this.currentSongIndex();
        const order = this.serviceOrder();

        if (index < order.length - 1) {
            const nextItem = order[index + 1];
            await this.loadItem(nextItem, index + 1);
        }
    }

    private generateLyricsFromMap(songMap: SongMap): string {
        return songMap.sections.map(s => {
            const lyrics = s.lyrics.trim();
            if (!lyrics) return `[${s.label}]`;
            return `[${s.label}]\n${lyrics}`;
        }).join('\n\n');
    }

    async openSongMapEditor(item: ServiceOrderItem, index: number): Promise<void> {
        const { SongMapModalComponent } = await import('../components/modals/song-map-modal/song-map-modal.component');

        const dialogRef = this.dialog.open<SongMap | null>(SongMapModalComponent, {
            data: {
                songName: item.name,
                songPath: item.path,
                existingMap: item.songMap
            }
        });

        dialogRef.closed.subscribe(async (result) => {
            if (result) {
                // Save to song folder
                const success = await this.electron.invoke('service-order:saveSongMap', item.path, result);
                if (success) {
                    console.log('Song map saved successfully');
                    // Reload item to reflect changes
                    await this.loadItem(item, index);
                }
            }
        });
    }
}
