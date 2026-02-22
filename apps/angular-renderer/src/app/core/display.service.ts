import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronService } from './electron.service';
import { Display, DisplayWindow } from '../models/display.models';
import { Slide } from '../models/slide.models';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class DisplayService {
    private readonly electron = inject(ElectronService);

    // ── Reactive State ──────────────────────────────────────────────────────────
    readonly displays = signal<Display[]>([]);
    readonly windowStatus = signal<Record<string, { visible: boolean; exists: boolean }>>({
        audience: { visible: false, exists: false },
        confidence: { visible: false, exists: false },
        lowerThirds: { visible: false, exists: false }
    });
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    constructor() {
        // Periodically refresh window status if needed, 
        // but usually we refresh on action or through events
        if (this.electron.isElectron) {
            this.refreshWindowStatus().subscribe();
        }
    }

    /**
     * Get all available displays
     */
    refreshDisplays(): Observable<Display[]> {
        this.isLoading.set(true);
        // Note: React used settings:getDisplays, but main has settings: handlers too
        return from(this.electron.invoke('settings:getDisplays')).pipe(
            map(res => res as Display[]),
            tap(displays => {
                this.displays.set(displays);
                this.isLoading.set(false);
            }),
            catchError(err => {
                this.error.set(`Failed to get displays: ${err.message || err}`);
                this.isLoading.set(false);
                return of([]);
            })
        );
    }

    /**
     * Refresh the status of all display windows
     */
    refreshWindowStatus(): Observable<any> {
        return from(this.electron.invoke('window:getAllStatus')).pipe(
            tap(status => {
                if (status) {
                    this.windowStatus.set(status);
                }
            }),
            catchError(err => {
                console.error('Failed to get window status:', err);
                return of(null);
            })
        );
    }

    /**
     * Toggle a display window
     */
    toggleWindow(type: string): Observable<boolean> {
        return from(this.electron.invoke('window:toggle', type)).pipe(
            tap(() => this.refreshWindowStatus().subscribe()),
            catchError(err => {
                console.error(`Failed to toggle window ${type}:`, err);
                return of(false);
            })
        );
    }

    /**
     * Clear all display content
     */
    clearAll(): Observable<void> {
        return from(this.electron.invoke('display:clearAll')).pipe(
            catchError(err => {
                console.error('Failed to clear display:', err);
                return of(void 0);
            })
        );
    }

    /**
     * Show a slide on display windows
     */
    showSlide(slide: Slide): Observable<void> {
        // Map Slide model to what display:slide expects if necessary
        const content = {
            id: slide.id,
            type: (slide as any).type || 'lyric',
            title: slide.title,
            text: (slide as any).text || [slide.content],
            section: (slide as any).section || '',
            path: (slide as any).path || '',
            backgroundColor: slide.backgroundColor,
            textColor: slide.textColor
        };

        return from(this.electron.invoke('display:slide', content)).pipe(
            catchError(err => {
                console.error('Failed to show slide:', err);
                return of(void 0);
            })
        );
    }

    /**
     * Display a video on the audience screen
     */
    displayVideoSlide(path: string, duration?: number, loop: boolean = false): Observable<void> {
        return from(this.electron.invoke('display:videoSlide', path, duration, loop)).pipe(
            catchError(err => {
                console.warn('display:videoSlide failed', err);
                return of(void 0);
            })
        );
    }

    /**
     * Black out the audience screen
     */
    blackScreen(): Observable<void> {
        return from(this.electron.invoke('display:blackScreen')).pipe(
            catchError(err => {
                console.error('Failed to black screen:', err);
                return of(void 0);
            })
        );
    }
}
