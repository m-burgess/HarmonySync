import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, fromEvent, EMPTY, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ElectronService } from './electron.service';
import type { Track, WsEvent } from '../models/audio.models';
import { MessagingService } from './messaging.service';
import { EVENT_TYPES } from '../models/messaging.models';

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
    private readonly messaging = inject(MessagingService);
    private readonly base = environment.apiBaseUrl;

    // ── Reactive state (Angular signals) ──────────────────────────────────────
    readonly tracks = signal<Track[]>([]);
    readonly isPlaying = signal(false);
    readonly isPaused = signal(false);
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly currentSongPath = signal<string | null>(null);
    readonly connectionStatus = signal<'connecting' | 'connected' | 'error'>('connecting');
    readonly currentPosition = signal<number>(0);

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
        // Now using Electron Bridge for events
        this.electron.on('media-engine:event', (event: any) => {
            this.wsEvents$.next(event);
            this.handleWsEvent(event);
        });
        this.connectionStatus.set('connected');
    }

    disconnectWebSocket(): void {
        this.ws?.close();
        this.ws = null;
    }

    // ── REST: Song / Track loading ─────────────────────────────────────────────

    /**
     * Load tracks from a folder path.
     */
    private readonly SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac'];

    loadTracks(folderPath: string): Observable<Track[]> {
        this.isLoading.set(true);
        this.error.set(null);

        const songId = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? 'song';

        const fileScan$: Observable<string[]> = window.electronAPI
            ? from(window.electronAPI.getAudioFiles(folderPath))
            : EMPTY;

        return fileScan$.pipe(
            map((fileNames: string[]) => {
                const sep = folderPath.includes('/') ? '/' : '\\';
                const fullPaths = fileNames.map((f: string) => `${folderPath}${sep}${f}`);
                return fullPaths.filter((fp: string) => {
                    const lower = fp.toLowerCase();
                    return this.SUPPORTED_FORMATS.some(ext => lower.endsWith(ext));
                });
            }),
            switchMap((filePaths: string[]) => {
                if (filePaths.length === 0) {
                    this.error.set('No supported audio files found');
                    this.isLoading.set(false);
                    return EMPTY;
                }

                const goTracks: GoTrackInfo[] = filePaths.map((fp: string) => {
                    const fileName = fp.split(/[\\/]/).pop() ?? fp;
                    return {
                        id: fileName.replace(/\.[^.]+$/, '') ?? fp,
                        path: fp,
                        duration: 0,
                        pan: this.calculatePan(fileName),
                    };
                });

                return from(this.electron.invoke('media-engine:load-song', songId, goTracks))
                    .pipe(
                        map(() => {
                            const tracks: Track[] = goTracks.map((gt, i) => ({
                                id: gt.id,
                                name: gt.id.replace(/_/g, ' '),
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
                        switchMap((tracks: Track[]) => {
                            // Try to load saved mixer config
                            return this.loadMixerConfig(folderPath).pipe(
                                map(savedConfig => {
                                    if (savedConfig && Array.isArray(savedConfig.tracks)) {
                                        return tracks.map(t => {
                                            const saved = savedConfig.tracks.find((st: any) => st.id === t.id);
                                            if (saved) {
                                                // Apply saved settings via Electron Bridge
                                                from(this.electron.invoke('media-engine:set-volume', t.id, saved.volume ?? t.volume)).subscribe();
                                                from(this.electron.invoke('media-engine:set-pan', t.id, saved.pan ?? t.pan)).subscribe();
                                                from(this.electron.invoke('media-engine:set-mute', t.id, saved.muted ?? t.muted)).subscribe();

                                                return {
                                                    ...t,
                                                    volume: saved.volume ?? t.volume,
                                                    pan: saved.pan ?? t.pan,
                                                    muted: saved.muted ?? t.muted
                                                };
                                            }
                                            return t;
                                        });
                                    }
                                    return tracks;
                                }),
                                catchError(() => from([tracks]))
                            );
                        }),
                        tap((tracks: Track[]) => {
                            this.tracks.set(tracks);
                            this.currentSongPath.set(folderPath);
                            this.isLoading.set(false);
                            this.messaging.publish(EVENT_TYPES.AUDIO_TRACKS_LOADED, { songId, tracks });
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

    setTracks(tracks: Track[]): void {
        this.tracks.set(tracks);
    }

    setTrackVolume(trackId: string, volume: number): void {
        this.tracks.update(tracks =>
            tracks.map(t => t.id === trackId ? { ...t, volume } : t)
        );
        from(this.electron.invoke('media-engine:set-volume', trackId, volume))
            .pipe(
                tap(() => {
                    this.messaging.publish(EVENT_TYPES.AUDIO_VOLUME_CHANGED, { trackId, volume });
                }),
                catchError(() => EMPTY)
            )
            .subscribe();
    }

    setTrackPan(trackId: string, pan: number): void {
        this.tracks.update(tracks =>
            tracks.map(t => t.id === trackId ? { ...t, pan } : t)
        );
        from(this.electron.invoke('media-engine:set-pan', trackId, pan))
            .pipe(
                catchError(() => EMPTY)
            )
            .subscribe();
    }

    toggleMute(trackId: string): void {
        const track = this.tracks().find(t => t.id === trackId);
        if (!track) return;

        const muted = !track.muted;
        this.tracks.update(tracks =>
            tracks.map(t => t.id === trackId ? { ...t, muted } : t)
        );

        from(this.electron.invoke('media-engine:set-mute', trackId, muted))
            .pipe(
                catchError(() => EMPTY)
            )
            .subscribe();
    }

    toggleSolo(trackId: string): void {
        const track = this.tracks().find(t => t.id === trackId);
        if (!track) return;

        const soloed = !track.soloed;
        this.tracks.update(tracks =>
            tracks.map(t => t.id === trackId ? { ...t, soloed } : t)
        );

        // Implementation of solo logic: if soloed, mute others.
        // For now, we update local state only as Go engine doesn't have a direct solo endpoint.
        // A better implementation would send multiple mute commands to the Go engine.
        const allOtherTracks = this.tracks().filter(t => t.id !== trackId);
        allOtherTracks.forEach(t => {
            // If this track is soloed, we should mute others that aren't also soloed.
            // This is complex for a simple POST-based API without stateful solo.
            // For now, we just update the local signal and let the UI reflect it.
        });

        this.messaging.publish(EVENT_TYPES.AUDIO_SOLO_TOGGLED, { trackId, soloed });
    }

    transpose(songId: string, semitones: number): Observable<void> {
        this.isLoading.set(true);
        return from(this.electron.invoke('media-engine:transpose', songId, semitones)).pipe(
            map(() => { }),
            tap(() => this.isLoading.set(false)),
            catchError(err => {
                this.error.set(err?.message ?? 'Transpose failed');
                this.isLoading.set(false);
                return EMPTY;
            })
        );
    }

    play(): Observable<void> {
        return from(this.electron.invoke('media-engine:play')).pipe(
            map(() => { }),
            tap(() => {
                this.isPlaying.set(true);
                this.isPaused.set(false);
                this.messaging.publish(EVENT_TYPES.AUDIO_PLAYBACK_STARTED, {});
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Play failed');
                return EMPTY;
            }),
        );
    }

    pause(): Observable<void> {
        return from(this.electron.invoke('media-engine:pause')).pipe(
            map(() => { }),
            tap(() => {
                this.isPlaying.set(false);
                this.isPaused.set(true);
                this.messaging.publish(EVENT_TYPES.AUDIO_PLAYBACK_PAUSED, {});
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Pause failed');
                return EMPTY;
            }),
        );
    }

    stop(): Observable<void> {
        return from(this.electron.invoke('media-engine:stop')).pipe(
            map(() => { }),
            tap(() => {
                this.isPlaying.set(false);
                this.isPaused.set(false);
                this.messaging.publish(EVENT_TYPES.AUDIO_PLAYBACK_STOPPED, {});
                this.currentPosition.set(0);
            }),
            catchError((err: Error) => {
                this.error.set(err?.message ?? 'Stop failed');
                return EMPTY;
            }),
        );
    }

    private calculatePan(fileName: string): number {
        const lower = fileName.toLowerCase();
        if (lower.includes('split') || lower.includes('stereo')) return 0;
        if (lower.includes('click') || lower.includes('guide') || lower.includes('metronome')) return -1;
        return 1;
    }

    private handleWsEvent(event: any): void {
        switch (event.type) {
            case 'playback_position':
                this.currentPosition.set(event.position);
                break;
            case 'audio_play':
                this.isPlaying.set(true);
                this.isPaused.set(false);
                break;
            case 'audio_pause':
                this.isPlaying.set(false);
                this.isPaused.set(true);
                break;
            case 'audio_stop':
            case 'audio_cleared':
                this.isPlaying.set(false);
                this.isPaused.set(false);
                this.currentPosition.set(0);
                if (event.type === 'audio_cleared') this.tracks.set([]);
                break;
            case 'audio_finished':
                this.isPlaying.set(false);
                this.isPaused.set(false);
                this.currentPosition.set(0);
                this.messaging.publish(EVENT_TYPES.AUDIO_PLAYBACK_FINISHED, { songId: event.songId });
                break;
            case 'audio_volume_changed': {
                const { trackId, volume } = event;
                this.tracks.update(tracks =>
                    tracks.map(t => t.id === trackId ? { ...t, volume } : t)
                );
                break;
            }
        }
    }

    public saveMixerConfig(): void {
        const path = this.currentSongPath();
        if (!path) return;

        const config = {
            tracks: this.tracks().map(t => ({
                id: t.id,
                volume: t.volume,
                pan: t.pan,
                muted: t.muted
            })),
            timestamp: Date.now()
        };

        from(this.electron.invoke('audio:saveMixerConfig', path, config)).subscribe();
    }

    private loadMixerConfig(songPath: string): Observable<any> {
        return from(this.electron.invoke('audio:loadMixerConfig', songPath));
    }
}
