import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, fromEvent, EMPTY, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ElectronService } from './electron.service';
import type { Track, WsEvent } from '../models/audio.models';

// Declare the Electron preload globals so TS doesn't complain
declare const window: Window & {
    electronAPI?: {
        getAudioFiles: (folderPath: string) => Promise<string[]>;
    };
};

/**
 * AudioService — the ONLY class that may talk to the Go media engine.
 *
 * API Contract (Go media engine):
 *   POST /api/songs/create   { id: string, tracks: GoTrackInfo[] }
 *   POST /api/mixer/play     {}
 *   POST /api/mixer/pause    {}
 *   POST /api/mixer/stop     {}
 *   POST /api/mixer/mute     { trackId: string, muted: boolean }
 *   POST /api/mixer/pan      { trackId: string, pan: number }
 *   POST /api/mixer/volume   { trackId: string, volume: number }
 *   WS   /ws
 */

/** Shape the Go engine expects when creating a song */
interface GoTrackInfo {
    id: string;
    path: string;
    duration: number;
    pan: number;
}

@Injectable({ providedIn: 'root' })
export class AudioService {
    private readonly http = inject(HttpClient);
    private readonly electron = inject(ElectronService);
    private readonly base = environment.apiBaseUrl;

    // ── Reactive state (Angular signals) ──────────────────────────────────────
    readonly tracks = signal<Track[]>([]);
    readonly isPlaying = signal(false);
    readonly isPaused = signal(false);
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly currentSongPath = signal<string | null>(null);
    readonly connectionStatus = signal<'connecting' | 'connected' | 'error'>('connecting');

    // Derived / computed
    readonly hasTracksLoaded = computed(() => this.tracks().length > 0);
    readonly playbackState = computed(() => {
        if (this.isPlaying()) return 'playing' as const;
        if (this.isPaused()) return 'paused' as const;
        return 'stopped' as const;
    });

    // ── WebSocket ─────────────────────────────────────────────────────────────
    private ws: WebSocket | null = null;
    private readonly wsEvents$ = new Subject<WsEvent>();

    get events$(): Observable<WsEvent> {
        return this.wsEvents$.asObservable();
    }

    connectWebSocket(): void {
        if (this.ws) return;

        this.connectionStatus.set('connecting');
        this.ws = new WebSocket(environment.wsUrl);

        fromEvent<MessageEvent>(this.ws, 'message')
            .pipe(map((e: MessageEvent) => JSON.parse(e.data) as WsEvent))
            .subscribe((event: WsEvent) => {
                this.wsEvents$.next(event);
                this.handleWsEvent(event);
            });

        fromEvent(this.ws, 'open').subscribe(() => this.connectionStatus.set('connected'));
        fromEvent(this.ws, 'error').subscribe(() => this.connectionStatus.set('error'));
        fromEvent(this.ws, 'close').subscribe(() => {
            this.ws = null;
            this.connectionStatus.set('error');
        });
    }

    disconnectWebSocket(): void {
        this.ws?.close();
        this.ws = null;
    }

    // ── REST: Song / Track loading ─────────────────────────────────────────────

    /**
     * Load tracks from a folder path.
     * 1. Uses window.electronAPI.getAudioFiles to enumerate audio files in the folder
     * 2. Builds the GoTrackInfo list with file paths as IDs
     * 3. POSTs to /api/songs/create with the correct shape
     */
    // Formats supported by the Go beep decoder
    private readonly SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac'];

    loadTracks(folderPath: string): Observable<Track[]> {
        this.isLoading.set(true);
        this.error.set(null);

        // Derive a stable song ID from the folder name
        const songId = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? 'song';

        // Step 1: get audio file list via Electron preload (available in Electron context)
        const fileScan$: Observable<string[]> = window.electronAPI
            ? from(window.electronAPI.getAudioFiles(folderPath))
            : EMPTY;

        return fileScan$.pipe(
            map((fileNames: string[]) => {
                // audio:getFiles returns bare filenames (not full paths) — join with folderPath
                const sep = folderPath.includes('/') ? '/' : '\\';
                const fullPaths = fileNames.map((f: string) => `${folderPath}${sep}${f}`);

                // Filter to only formats the Go beep engine supports
                const filtered = fullPaths.filter((fp: string) => {
                    const lower = fp.toLowerCase();
                    return this.SUPPORTED_FORMATS.some(ext => lower.endsWith(ext));
                });
                return filtered;
            }),
            switchMap((filePaths: string[]) => {

                if (filePaths.length === 0) {
                    this.error.set('No supported audio files found (need .mp3, .wav, .ogg, or .flac)');
                    this.isLoading.set(false);
                    return EMPTY;
                }

                // Build the Go-compatible track list
                const goTracks: GoTrackInfo[] = filePaths.map((fp: string) => {
                    const fileName = fp.split(/[\\/]/).pop() ?? fp;
                    return {
                        id: fileName.replace(/\.[^.]+$/, '') ?? fp,
                        path: fp,
                        duration: 0, // Go engine reads actual duration on load
                        pan: this.calculatePan(fileName),
                    };
                });

                return this.http
                    .post<{ status: string; id: string }>(
                        `${this.base}/api/songs/create`,
                        { id: songId, tracks: goTracks }
                    )
                    .pipe(
                        map(() => {
                            // Build our local Track[] from the GoTrackInfo list
                            const tracks: Track[] = goTracks.map((gt, i) => ({
                                id: gt.id,
                                name: gt.id,
                                path: gt.path,
                                index: i,
                                volume: 1.0,
                                pan: gt.pan,
                                muted: false,
                                soloed: false,
                                isPreloaded: true,
                                preloadStatus: 'ready' as const,
                                duration: 0,
                            }));
                            return tracks;
                        }),
                        tap((tracks: Track[]) => {
                            this.tracks.set(tracks);
                            this.currentSongPath.set(folderPath);
                            this.isLoading.set(false);
                        }),
                        catchError((err: HttpErrorResponse | Error) => {
                            const msg = err instanceof HttpErrorResponse
                                ? `HTTP ${err.status}: ${err.error ?? err.message}`
                                : (err?.message ?? 'Failed to load tracks');
                            this.error.set(msg);
                            this.isLoading.set(false);
                            return EMPTY;
                        }),
                    );
            }),
            catchError((err: Error) => {
                this.error.set('Could not scan folder: ' + (err?.message ?? String(err)));
                this.isLoading.set(false);
                return EMPTY;
            }),
        );
    }

    /**
     * Preload a song into the Go engine without setting it as active.
     */
    preloadSong(songId: string, trackFiles: string[]): Observable<any> {
        const goTracks: GoTrackInfo[] = trackFiles.map(fp => {
            const fileName = fp.split(/[\\/]/).pop() ?? fp;
            return {
                id: fileName.replace(/\.[^.]+$/, '') ?? fp,
                path: fp,
                duration: 0,
                pan: this.calculatePan(fileName)
            };
        });

        return this.http.post(`${this.base}/api/songs/create`, { id: songId, tracks: goTracks });
    }
    /**
     * Set tracks manually (bridge for non-folder loading)
     */
    setTracks(tracks: Track[]): void {
        this.tracks.set(tracks);
    }

    /**
     * Set volume for a specific track
     */
    setTrackVolume(trackId: string, volume: number): void {
        const currentTracks = this.tracks();
        const updatedTracks = currentTracks.map(t =>
            t.id === trackId ? { ...t, volume } : t
        );
        this.tracks.set(updatedTracks);
        this.electron.emit('set-track-volume', { trackId, volume });
    }

    /**
     * Set pan for a specific track
     */
    setTrackPan(trackId: string, pan: number): void {
        const currentTracks = this.tracks();
        const updatedTracks = currentTracks.map(t =>
            t.id === trackId ? { ...t, pan } : t
        );
        this.tracks.set(updatedTracks);
        this.electron.emit('set-track-pan', { trackId, pan });
    }

    /**
     * Toggle mute for a specific track
     */
    toggleMute(trackId: string): void {
        const currentTracks = this.tracks();
        const updatedTracks = currentTracks.map(t =>
            t.id === trackId ? { ...t, muted: !t.muted } : t
        );
        this.tracks.set(updatedTracks);

        const track = updatedTracks.find(t => t.id === trackId);
        if (track) {
            this.http.post<void>(`${this.base}/api/mixer/mute`, { trackId, muted: track.muted })
                .pipe(catchError(() => EMPTY))
                .subscribe();
        }
    }

    /**
     * Toggle solo for a specific track
     */
    toggleSolo(trackId: string): void {
        const currentTracks = this.tracks();
        const isSoloed = currentTracks.find(t => t.id === trackId)?.soloed;

        const updatedTracks = currentTracks.map(t =>
            t.id === trackId ? { ...t, soloed: !isSoloed } : t
        );
        this.tracks.set(updatedTracks);
        // Solo logic usually handled by engine, but we notify
        this.electron.emit('set-track-solo', { trackId, soloed: !isSoloed });
    }

    /**
     * Transpose all tracks by semitones
     */
    transpose(semitones: number): Observable<void> {
        this.isLoading.set(true);
        // This usually involves a call to the Go engine or FFmpeg via Electron
        // For now, let's assume it's an IPC call via ElectronService (or window.electronAPI)
        // Since we are in AudioService which talks to Go API:
        return this.http.post<void>(`${this.base}/api/mixer/transpose`, { semitones }).pipe(
            tap(() => this.isLoading.set(false)),
            catchError(err => {
                this.error.set(err?.message ?? 'Transpose failed');
                this.isLoading.set(false);
                return EMPTY;
            })
        );
    }

    // ── REST: Playback controls ────────────────────────────────────────────────

    play(): Observable<void> {
        return this.http.post<void>(`${this.base}/api/mixer/play`, {}).pipe(
            tap(() => {
                this.isPlaying.set(true);
                this.isPaused.set(false);
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Play failed');
                return EMPTY;
            }),
        );
    }

    pause(): Observable<void> {
        return this.http.post<void>(`${this.base}/api/mixer/pause`, {}).pipe(
            tap(() => {
                this.isPlaying.set(false);
                this.isPaused.set(true);
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Pause failed');
                return EMPTY;
            }),
        );
    }

    stop(): Observable<void> {
        return this.http.post<void>(`${this.base}/api/mixer/stop`, {}).pipe(
            tap(() => {
                this.isPlaying.set(false);
                this.isPaused.set(false);
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Stop failed');
                return EMPTY;
            }),
        );
    }

    // ── REST: Track controls (Go API uses string trackId, not numeric index) ──

    /**
     * trackIndex is the position in our local tracks array.
     * We look up the track's string id and send that to the Go engine.
     */
    setMute(trackIndex: number, muted: boolean): Observable<void> {
        const track = this.tracks()[trackIndex];
        if (!track) return EMPTY;

        return this.http
            .post<void>(`${this.base}/api/mixer/mute`, { trackId: track.id, muted })
            .pipe(
                tap(() => {
                    this.tracks.update(tracks =>
                        tracks.map((t, i) => (i === trackIndex ? { ...t, muted } : t)),
                    );
                }),
                catchError((err: Error) => {
                    this.error.set(err?.message ?? 'Mute failed');
                    return EMPTY;
                }),
            );
    }

    setPan(trackIndex: number, pan: number): Observable<void> {
        const track = this.tracks()[trackIndex];
        if (!track) return EMPTY;

        return this.http
            .post<void>(`${this.base}/api/mixer/pan`, { trackId: track.id, pan })
            .pipe(
                tap(() => {
                    this.tracks.update(tracks =>
                        tracks.map((t, i) => (i === trackIndex ? { ...t, pan } : t)),
                    );
                }),
                catchError((err: Error) => {
                    this.error.set(err?.message ?? 'Pan failed');
                    return EMPTY;
                }),
            );
    }

    setVolume(trackIndex: number, volume: number): Observable<void> {
        const track = this.tracks()[trackIndex];
        if (!track) return EMPTY;

        return this.http
            .post<void>(`${this.base}/api/mixer/volume`, { trackId: track.id, volume })
            .pipe(
                tap(() => {
                    this.tracks.update(tracks =>
                        tracks.map((t, i) => (i === trackIndex ? { ...t, volume } : t)),
                    );
                }),
                catchError((err: Error) => {
                    this.error.set(err?.message ?? 'Volume failed');
                    return EMPTY;
                }),
            );
    }

    private calculatePan(fileName: string): number {
        const lower = fileName.toLowerCase();
        if (lower.includes('split') || lower.includes('stereo')) {
            return 0; // Center
        }
        if (lower.includes('click') || lower.includes('guide') || lower.includes('metronome')) {
            return -1; // Left
        }
        return 1; // Right (Everything else)
    }
    // ── Private ────────────────────────────────────────────────────────────────

    private handleWsEvent(event: WsEvent): void {
        switch (event.type) {
            case 'playback_state': {
                const state = event.payload as { is_playing: boolean; is_paused: boolean };
                this.isPlaying.set(state.is_playing);
                this.isPaused.set(state.is_paused);
                break;
            }
            case 'audio_load_progress': {
                // Could surface progress in a signal if needed
                break;
            }
        }
    }
}
