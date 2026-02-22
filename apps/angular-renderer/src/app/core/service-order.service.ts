import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronService } from './electron.service';
import { AudioService } from './audio.service';
import { SlideService } from './slide.service';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface ServiceOrderItem {
    id?: string;
    name: string;
    path: string;
    type: 'song' | 'folder' | 'presentation';
    tracks?: any[];
    lyrics?: string;
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

    // Reactive state
    readonly serviceOrder = signal<ServiceOrderItem[]>([]);
    readonly currentSongIndex = signal<number>(-1);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

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
            }
        });
    }

    async addFolders(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);

        try {
            const result = await this.electron.invoke('dialog:selectFolders', { title: 'Add Folders to Service Order' });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                this.isLoading.set(false);
                return;
            }

            for (const folderPath of result.filePaths) {
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
        } catch (err) {
            console.error('Failed to add folders:', err);
            this.error.set(err instanceof Error ? err.message : String(err));
        } finally {
            this.isLoading.set(false);
        }
    }

    async preloadSong(item: ServiceOrderItem): Promise<void> {
        if (item.type !== 'song') return;

        const songId = item.id || item.path.split(/[\\/]/).filter(Boolean).pop() || 'song';

        // Get audio files in folder
        try {
            const fileNames = await this.electron.invoke('fs:readDir', item.path);
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
        } catch (err) {
            console.error('Failed to read folder for preload:', err);
        }
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

            // 2. Load lyrics if available
            const lyrics = await this.electron.invoke('service-order:loadLyrics', item.path);
            if (lyrics) {
                this.serviceOrder.update(order => order.map(i => i.path === item.path ? { ...i, lyrics } : i));
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
}
