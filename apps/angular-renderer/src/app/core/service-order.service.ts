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
import { ServiceMapper } from '../utils/service-mapper';
import { SongMap, SongMapper } from '@harmonysync/core';
import commonMacros from '../data/common_macros.json';

export interface ServiceOrderItem {
    id?: string;
    name: string;
    path: string;
    type: 'song' | 'folder' | 'presentation' | 'sermon';
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

    // Reactive state
    readonly serviceOrder = signal<ServiceOrderItem[]>([]);
    readonly currentSongIndex = signal<number>(-1);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);
    readonly autoplayEnabled = signal<boolean>(false);
    readonly folderScheduleEvents = signal<any[]>([]);

    private macros = commonMacros;


    // Derived state
    readonly hasSongs = computed(() => this.serviceOrder().length > 0);
    readonly currentSong = computed(() => {
        const index = this.currentSongIndex();
        const order = this.serviceOrder();
        return index >= 0 && index < order.length ? order[index] : null;
    });

    constructor() {
        // Listen for service-order-loaded event from Electron
        this.electron.on('service-order-loaded', async (data: { serviceOrder: ServiceOrderItem[] }) => {
            if (data && data.serviceOrder) {
                this.serviceOrder.set(data.serviceOrder);
                this.currentSongIndex.set(-1); // Reset index on new list

                // Attempt to load schedule.json from parent directories
                if (data.serviceOrder.length > 0) {
                    const parentDirs = new Set<string>();
                    for (const item of data.serviceOrder) {
                        const sep = item.path.includes('\\') ? '\\' : '/';
                        const parts = item.path.split(sep);
                        if (parts.length > 1) {
                            parts.pop(); // remove item name
                            parentDirs.add(parts.join(sep));
                        }
                    }

                    const allEvents: any[] = [];
                    for (const dir of parentDirs) {
                        try {
                            const scheduleData = await this.electron.invoke('service-order:loadSchedule', dir);
                            if (scheduleData && scheduleData.events) {
                                allEvents.push(...scheduleData.events.map((e: any) => ({...e, servicePath: dir})));
                            }
                        } catch (e) {
                            console.error('[ServiceOrder] Failed to load schedule for dir:', dir, e);
                        }
                    }
                    if (allEvents.length > 0) {
                        console.log('[ServiceOrder] Loaded folder schedules:', allEvents);
                        this.folderScheduleEvents.set(allEvents);
                    }
                }
            }
        });

        this.electron.on('video-ended', () => {
            this.executeOnEndTriggers();
            const settings = this.config.settings();
            if (settings?.serviceOrder?.advanceOnVideoEnd) {
                console.log('[ServiceOrder] Video ended, advancing because advanceOnVideoEnd is true');
                this.advanceToNext();
            }
        });

        this.messaging.subscribe<any>(EVENT_TYPES.AUDIO_PLAYBACK_FINISHED).subscribe(() => {
            this.executeOnEndTriggers();
            const settings = this.config.settings();
            if (settings?.serviceOrder?.advanceOnVideoEnd) {
                console.log('[ServiceOrder] Audio finished, advancing because advanceOnVideoEnd is true');
                this.advanceToNext();
            }
        });
    }

    private executeOnEndTriggers() {
        const current = this.currentSong();
        if (!current) return;
        const folderEvents = this.folderScheduleEvents();
        if (folderEvents && folderEvents.length > 0) {
            folderEvents.forEach(event => {
                if (event.trigger === 'onEnd' && event.servicePath === current.path) {
                    this.executeFolderEvent(event);
                }
            });
        }
    }

    initWatchFolder(): void {
        // Watch folder disabled per user request
    }

    private scanWatchFolder(path: string): void {
        this.fileService.readDirDetailed(path).subscribe({
            next: (entries) => {
                if (!entries || entries.length === 0) return;
                
                const directories = entries.filter(e => e.isDirectory);
                
                for (const dir of directories) {
                    // Only add if not already in the service order
                    if (!this.serviceOrder().some(item => item.path === dir.path)) {
                        console.log(`[ServiceOrder] Found new folder in watch directory: ${dir.name}`);
                        this.addFolderToServiceOrder(dir.path).catch(err => {
                            console.error(`[ServiceOrder] Failed to auto-add ${dir.name}:`, err);
                        });
                    }
                }
            },
            error: (err) => console.error('[ServiceOrder] Failed to scan watch folder:', err)
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
                    await this.addFolderToServiceOrder(folderPath);
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

    async addServiceOrderFolder(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);

        this.fileService.selectFolders('Select Service Order Folder').subscribe({
            next: async (filePaths) => {
                if (!filePaths || filePaths.length === 0) {
                    this.isLoading.set(false);
                    return;
                }

                const folderPath = filePaths[0];
                this.fileService.readDirDetailed(folderPath).subscribe({
                    next: async (entries) => {
                        const directories = entries.filter(e => e.isDirectory);
                        for (const dir of directories) {
                            await this.addFolderToServiceOrder(dir.path);
                        }
                        this.isLoading.set(false);
                    },
                    error: (err) => {
                        console.error('Failed to read service order folder:', err);
                        this.error.set(err instanceof Error ? err.message : String(err));
                        this.isLoading.set(false);
                    }
                });
            },
            error: (err) => {
                console.error('Failed to select service order folder:', err);
                this.error.set(err instanceof Error ? err.message : String(err));
                this.isLoading.set(false);
            }
        });
    }

    public async addFolderToServiceOrder(folderPath: string): Promise<void> {
        // Check if already in service order
        if (this.serviceOrder().some(item => item.path === folderPath)) {
            return;
        }

        // Load metadata
        const metadata = await this.electron.invoke('service-order:loadSongMetadata', folderPath);

        // Load schedule.json if present
        try {
            const scheduleData = await this.electron.invoke('service-order:loadSchedule', folderPath);
            if (scheduleData && scheduleData.events) {
                console.log(`[ServiceOrder] Loaded schedule events from ${folderPath}`, scheduleData.events);
                this.folderScheduleEvents.update(events => [
                    ...events, 
                    ...scheduleData.events.map((e: any) => ({...e, servicePath: folderPath}))
                ]);
            }
        } catch (e) {
            console.error('[ServiceOrder] Failed to load schedule.json:', e);
        }

        // Auto-Ingest if song-map.json is missing
        if (metadata.type === 'song' && metadata.hasAudio) {
            const pathSep = folderPath.includes('\\') ? '\\' : '/';
            const xmlPath = `${folderPath}${pathSep}song-map.json`;
            const hasXml = await this.electron.invoke('fs:exists', xmlPath);
            
            if (!hasXml) {
                console.log(`[ServiceOrder] song-map.json missing. Triggering auto-ingestion for ${folderPath}`);
                try {
                    await this.electron.invoke('python:processSongFolder', folderPath, false);
                } catch (e) {
                    console.error(`[ServiceOrder] Auto-ingestion failed:`, e);
                }
            }
        }

        this.serviceOrder.update(order => {
            const newOrder = [...order, metadata];
            // Sort to ensure sequential folders stay ordered
            return newOrder.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Auto-preload if it's a song
        if (metadata.type === 'song' && metadata.hasAudio) {
            this.preloadSong(metadata);
        }
    }

    async refreshCurrentItem(): Promise<void> {
        this.isLoading.set(true);
        try {
            // Clear all existing folder schedules
            this.folderScheduleEvents.set([]);
            
            // Reload schedule.json for all items
            for (const item of this.serviceOrder()) {
                try {
                    const scheduleData = await this.electron.invoke('service-order:loadSchedule', item.path);
                    if (scheduleData && scheduleData.events) {
                        console.log(`[ServiceOrder] Reloaded schedule events from ${item.path}`);
                        this.folderScheduleEvents.update(events => [
                            ...events, 
                            ...scheduleData.events.map((e: any) => ({...e, servicePath: item.path}))
                        ]);
                    }
                } catch (e) {
                    console.error(`[ServiceOrder] Failed to reload schedule.json for ${item.path}:`, e);
                }
            }

            // Reload song-map.json for the current song if any
            const current = this.currentSong();
            const index = this.currentSongIndex();
            if (current) {
                await this.loadItem(current, index);
            }
        } finally {
            this.isLoading.set(false);
        }
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
                    .filter((f: string) => !f.toLowerCase().includes('reference'))
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

        // Execute onSelect triggers for this folder
        const folderEvents = this.folderScheduleEvents();
        if (folderEvents && folderEvents.length > 0) {
            folderEvents.forEach(event => {
                if (event.trigger === 'onSelect' && event.servicePath === item.path) {
                    this.executeFolderEvent(event);
                }
            });
        }

        try {
            // 1. Tell audio engine to load tracks (and set as active)
            if (item.type === 'song') {
                this.audio.loadTracks(item.path).subscribe();
            }

            // 2. Load Metadata (Lyrics or Sermon)
            if (item.type === 'song') {
                const songMapResult = await this.electron.invoke('service-order:loadSongMap', item.path);
                if (songMapResult) {
                    let songMap: SongMap;

                    if (songMapResult.type === 'legacy') {
                        // Legacy text/txt format
                        songMap = SongMapper.parse(songMapResult.raw);
                    } else {
                        // New Go-parsed XML format
                        songMap = songMapResult;
                    }

                    // Check if we need to auto-scrape
                    const hasLyrics = songMap.sections.some(s => s.lyrics && s.lyrics.trim().length > 5);
                    if (songMap.lyricsUrl && !hasLyrics) {
                        console.log(`[ServiceOrder] Lyrics missing but URL found. Auto-scraping...`);
                        const scrapedLyrics = await this.electron.invoke('lyrics:scrape', songMap.lyricsUrl);

                        if (scrapedLyrics) {
                            const lines = scrapedLyrics.split('\n');
                            let currentLabel = 'Verse 1';
                            let currentLyrics: string[] = [];
                            songMap.sections = [];

                            for (let line of lines) {
                                line = line.trim();
                                if (line.startsWith('[') && line.endsWith(']')) {
                                    if (currentLyrics.length > 0 || songMap.sections.length > 0) {
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

                            const updatedText = SongMapper.stringify(songMap);
                            await this.electron.invoke('service-order:saveLyrics', item.path, updatedText);
                            console.log(`[ServiceOrder] Auto-scraped lyrics saved and cached.`);
                        }
                    }

                    const lyrics = this.generateLyricsFromMap(songMap);

                    this.serviceOrder.update(order => order.map(i =>
                        i.path === item.path ? { ...i, songMap, lyrics } : i
                    ));

                    // Update remote control
                    this.electron.invoke('remote:update-song-data', {
                        name: item.name,
                        path: item.path,
                        songMap
                    });

                    // Send MIDI notes
                    if (songMap.midiNotes && songMap.midiNotes.length > 0) {
                        console.log(`[ServiceOrder] Sending MIDI notes: ${songMap.midiNotes.join(', ')}`);
                        for (const noteStr of songMap.midiNotes) {
                            const noteNum = this.noteToMidiNumber(noteStr);
                            if (noteNum !== -1) {
                                this.electron.invoke('midi:sendNote', 0, noteNum, 100, 500);
                            }
                        }
                    }
                }
            } else if (item.type === 'sermon') {
                const sermonRaw = await this.electron.invoke('service-order:loadSermon', item.path);
                if (sermonRaw) {
                    const sermonData = ServiceMapper.parse(sermonRaw);

                    // Check for Canva slides and snapshot them if needed
                    const canvaSlides = sermonData.slides.filter(s => s.type === 'canva');
                    if (canvaSlides.length > 0) {
                        this.isLoading.set(true);
                        for (const slide of canvaSlides) {
                            try {
                                console.log(`[ServiceOrder] Snapshotting Canva presentation: ${slide.url}`);
                                const outputDir = `${item.path}/canva_snapshots_${slide.id}`;
                                const snapshots = await this.electron.invoke('canva:importSlides', {
                                    url: slide.url,
                                    outputDir: outputDir
                                });

                                if (snapshots && snapshots.length > 0) {
                                    // Transform Canva slide into multiple image slides
                                    const snapshotSlides = snapshots.map((s: any, idx: number) => ({
                                        id: `${slide.id}-snap-${idx}`,
                                        type: 'image',
                                        name: `${slide.name} - Slide ${idx + 1}`,
                                        path: s.imagePath,
                                        url: `local://${s.imagePath}`
                                    }));

                                    // Replace the canva slide with its snapshots
                                    const slideIdx = sermonData.slides.findIndex(s => s.id === slide.id);
                                    if (slideIdx !== -1) {
                                        sermonData.slides.splice(slideIdx, 1, ...snapshotSlides);
                                    }
                                }
                            } catch (e) {
                                console.error(`[ServiceOrder] Failed to snapshot Canva presentation: ${slide.url}`, e);
                            }
                        }
                    }

                    // Set slides directly from sermon.txt
                    this.slideService.slides.set(sermonData.slides as any);
                    this.slideService.currentSlideIndex.set(sermonData.slides.length > 0 ? 0 : -1);

                    // Send MIDI notes
                    if (sermonData.midiNotes && sermonData.midiNotes.length > 0) {
                        console.log(`[ServiceOrder] Sending Sermon MIDI notes: ${sermonData.midiNotes.join(', ')}`);
                        for (const noteStr of sermonData.midiNotes) {
                            const noteNum = this.noteToMidiNumber(noteStr);
                            if (noteNum !== -1) {
                                this.electron.invoke('midi:sendNote', 0, noteNum, 100, 500);
                            }
                        }
                    }
                }
            }

            // 3. Trigger slide loading (Except for sermons which we handled above)
            if (item.type !== 'sermon') {
                this.slideService.loadFromFolder(item.path).subscribe();
            }

        } catch (err) {
            console.error('Failed to load item:', err);
            this.error.set(err instanceof Error ? err.message : String(err));
        } finally {
            this.isLoading.set(false);
        }
    }

    private noteToMidiNumber(noteStr: string): number {
        const notes: { [key: string]: number } = {
            'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4,
            'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9,
            'A#': 10, 'BB': 10, 'B': 11
        };
        const match = noteStr.trim().toUpperCase().match(/^([A-G]#?|D[B]|E[B]|G[B]|A[B]|B[B])-?(-?\d+)$/);
        if (!match) return -1;
        const note = match[1];
        const octave = parseInt(match[2], 10);
        return (notes[note] ?? 0) + (octave + 1) * 12;
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
            const header = s.chords ? `${s.label} | ${s.chords}` : s.label;
            const lyrics = s.lyrics.trim();
            if (!lyrics) return `[${header}]`;
            return `[${header}]\n${lyrics}`;
        }).join('\n\n');
    }
    async executeFolderEvent(event: any) {
        console.log(`[ServiceOrder] Triggering folder event: ${event.title || event.type}`);
        
        // Stop any running slide loops if a new event happens
        this.slideService.stopSlideLoop();

        try {
            switch(event.type) {
                case 'audio':
                case 'media':
                    if (event.url) {
                        this.electron.invoke('shell:openExternal', event.url);
                    }
                    break;
                case 'youtube':
                    if (event.url) {
                        this.electron.emit('display-youtube-slide', { url: event.url });
                    }
                    break;
                case 'slides':
                case 'presentation':
                    if (event.path && event.servicePath) {
                        console.log(`[ServiceOrder] Loading slides: ${event.path}`);
                        const path = await this.electron.invoke('path:join', event.servicePath, event.path);
                        this.slideService.loadFromFolder(path).subscribe(() => {
                            if (event.loop) {
                                const intervalMs = event.loopInterval || 10000;
                                console.log(`[ServiceOrder] Starting slide loop with interval ${intervalMs}ms`);
                                this.slideService.startSlideLoop(intervalMs);
                            }
                        });
                    }
                    break;
                case 'midi':
                    if (event.note !== undefined) {
                        this.electron.invoke('midi:sendNote', event.channel || 0, event.note, event.velocity || 127, event.duration || 500);
                    }
                    break;
                case 'macro':
                    if (event.macroId) {
                        const macro = this.macros.find(m => m.id === event.macroId);
                        if (macro) {
                            await this.electron.invoke('execute_macro', {
                                macroId: macro.id,
                                macroAction: macro.action,
                                midiNote: (macro as any).midiNote
                            });
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error(`[ServiceOrder] Failed to execute folder event ${event.title}:`, error);
        }
    }
}
