import { Injectable, inject, signal } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppSettings, ServiceTime } from '../models/config.models';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private readonly electron = inject(ElectronService);

    // ── Reactive State ──────────────────────────────────────────────────────────
    readonly settings = signal<AppSettings | null>(null);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    constructor() {
        if (this.electron.isElectron) {
            this.loadSettings().subscribe();
        }
    }

    /**
     * Load settings from the backend
     */
    loadSettings(): Observable<AppSettings | null> {
        this.isLoading.set(true);
        return from(this.electron.invoke('settings:get')).pipe(
            map(res => (res as any).success ? (res as any).settings as AppSettings : null),
            tap(settings => {
                if (settings) {
                    this.settings.set(settings);
                }
                this.isLoading.set(false);
            }),
            catchError(err => {
                this.error.set(`Failed to load settings: ${err.message || err}`);
                this.isLoading.set(false);
                return of(null);
            })
        );
    }

    /**
     * Save settings to the backend
     */
    saveSettings(settings: AppSettings): Observable<boolean> {
        this.isLoading.set(true);
        return from(this.electron.invoke('settings:save', settings)).pipe(
            map(res => (res as any).success),
            tap(success => {
                if (success) {
                    this.settings.set(settings);
                }
                this.isLoading.set(false);
            }),
            catchError(err => {
                this.error.set(`Failed to save settings: ${err.message || err}`);
                this.isLoading.set(false);
                return of(false);
            })
        );
    }

    /**
     * Update a specific setting part
     */
    updateSettings(updates: Partial<AppSettings>): Observable<boolean> {
        const current = this.settings();
        if (!current) return of(false);

        const newSettings = { ...current, ...updates };
        return this.saveSettings(newSettings);
    }

    /**
     * Add a service time
     */
    addServiceTime(time: Omit<ServiceTime, 'id'>): Observable<boolean> {
        const current = this.settings();
        if (!current) return of(false);

        const newTime: ServiceTime = {
            ...time,
            id: `service_time_${Date.now()}`
        };

        const serviceTimes = [...(current.serviceTimes || []), newTime];
        return this.updateSettings({ serviceTimes });
    }

    /**
     * Remove a service time
     */
    removeServiceTime(id: string): Observable<boolean> {
        const current = this.settings();
        if (!current) return of(false);

        const serviceTimes = (current.serviceTimes || []).filter(t => t.id !== id);
        return this.updateSettings({ serviceTimes });
    }
}
