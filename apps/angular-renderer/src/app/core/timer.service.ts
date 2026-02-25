import { Injectable, inject, signal } from '@angular/core';
import { ElectronService } from './electron.service';
import { Timer, CreateTimerRequest } from '../models/timer.models';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class TimerService {
    private readonly electron = inject(ElectronService);

    // ── Reactive State ──────────────────────────────────────────────────────────
    readonly timers = signal<Timer[]>([]);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    constructor() {
        if (this.electron.isElectron) {
            this.refreshTimers().subscribe();
        }
    }

    /**
     * Get all timers from the backend
     */
    refreshTimers(): Observable<Timer[]> {
        this.isLoading.set(true);
        return from(this.electron.invoke('timer:getAll')).pipe(
            map(res => res as Timer[]),
            tap(timers => {
                this.timers.set(timers || []);
                this.isLoading.set(false);
            }),
            catchError(err => {
                this.error.set(`Failed to get timers: ${err.message || err}`);
                this.isLoading.set(false);
                return of([]);
            })
        );
    }

    /**
     * Create a new timer
     */
    createTimer(request: CreateTimerRequest): Observable<Timer | null> {
        this.isLoading.set(true);
        return from(this.electron.invoke('timer:create', request)).pipe(
            map(res => res as Timer),
            tap(timer => {
                this.timers.update(prev => [...prev, timer]);
                this.isLoading.set(false);
            }),
            catchError(err => {
                this.error.set(`Failed to create timer: ${err.message || err}`);
                this.isLoading.set(false);
                return of(null);
            })
        );
    }

    /**
     * Update an existing timer
     */
    updateTimer(id: string, updates: Partial<Timer>): Observable<Timer | null> {
        return from(this.electron.invoke('timer:update', id, updates)).pipe(
            map(res => res as Timer),
            tap(updatedTimer => {
                this.timers.update(prev => prev.map(t => t.id === id ? updatedTimer : t));
            }),
            catchError(err => {
                console.error('Failed to update timer:', err);
                return of(null);
            })
        );
    }

    /**
     * Delete a timer
     */
    deleteTimer(id: string): Observable<void> {
        return from(this.electron.invoke('timer:delete', id)).pipe(
            tap(() => {
                this.timers.update(prev => prev.filter(t => t.id !== id));
            }),
            catchError(err => {
                console.error('Failed to delete timer:', err);
                return of(void 0);
            })
        );
    }

    /**
     * Control timer state
     */
    startTimer(id: string): Observable<void> {
        return from(this.electron.invoke('timer:start', id)).pipe(
            tap(() => this.refreshTimers().subscribe()),
            catchError(err => {
                console.error('Failed to start timer:', err);
                return of(void 0);
            })
        );
    }

    pauseTimer(id: string): Observable<void> {
        return from(this.electron.invoke('timer:pause', id)).pipe(
            tap(() => this.refreshTimers().subscribe()),
            catchError(err => {
                console.error('Failed to pause timer:', err);
                return of(void 0);
            })
        );
    }

    stopTimer(id: string): Observable<void> {
        return from(this.electron.invoke('timer:stop', id)).pipe(
            tap(() => this.refreshTimers().subscribe()),
            catchError(err => {
                console.error('Failed to stop timer:', err);
                return of(void 0);
            })
        );
    }

    resetTimer(id: string): Observable<void> {
        return from(this.electron.invoke('timer:reset', id)).pipe(
            tap(() => this.refreshTimers().subscribe()),
            catchError(err => {
                console.error('Failed to reset timer:', err);
                return of(void 0);
            })
        );
    }
}
