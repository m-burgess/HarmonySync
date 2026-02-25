import { Injectable, NgZone } from '@angular/core';

export interface ElectronAPI {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
    receive: (channel: string, callback: (data: any) => void) => (() => void) | undefined;

    // FFmpeg
    transcodeVideo: (inputPath: string) => Promise<string>;

    // Display
    displayVideoSlide: (path: string, duration: number) => Promise<void>;
    displaySlide: (content: any) => Promise<void>;

    // File system
    readFile: (path: string) => Promise<string>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

@Injectable({
    providedIn: 'root'
})
export class ElectronService {
    private api: ElectronAPI | undefined;

    constructor(private ngZone: NgZone) {
        if (window.electronAPI) {
            this.api = window.electronAPI;
        } else {
            console.warn('Electron API not found. If this is a browser, this is expected.');
        }
    }

    get isElectron(): boolean {
        return !!this.api;
    }

    async invoke(channel: string, ...args: any[]): Promise<any> {
        if (!this.api) return Promise.reject('Electron API not available');
        return this.api.invoke(channel, ...args);
    }

    send(channel: string, ...args: any[]): void {
        if (!this.api) return;
        this.api.send(channel, ...args);
    }

    on(channel: string, callback: (data: any) => void): (() => void) | undefined {
        if (!this.api) return undefined;

        // Wrap callback in NgZone to ensure change detection works
        return this.api.receive(channel, (data) => {
            this.ngZone.run(() => callback(data));
        });
    }

    // Simplified event emitter for cross-window communication
    emit(eventName: string, payload: any): void {
        if (!this.api) return;

        const audienceEvents = [
            'set-background',
            'display-lyric-slide',
            'display-image-slide',
            'display-video-slide',
            'display-lyrics',
            'display-slide',
            'clear-lyric-display'
        ];

        const confidenceEvents = [
            'display-confidence-slide',
            'display-confidence-lyrics',
            'clear-confidence-display',
            'video-progress'
        ];

        const lowerThirdsEvents = [
            'set-lower-thirds-text'
        ];

        if (audienceEvents.includes(eventName)) {
            this.invoke('send:audience', eventName, payload);
        } else if (confidenceEvents.includes(eventName)) {
            this.invoke('send:confidence', eventName, payload);
        } else if (lowerThirdsEvents.includes(eventName)) {
            this.invoke('send:lowerThirds', eventName, payload);
        }

        // Fallback to generic send if needed (to main process)
        this.api.send(eventName, payload);
    }

    convertFileSrc(filePath: string): string {
        if (!filePath) return '';
        if (filePath.startsWith('local://') || filePath.startsWith('http')) return filePath;

        let normalized = filePath.replace(/\\/g, '/');
        if (/^[A-Za-z]\//.test(normalized)) {
            normalized = `${normalized[0].toUpperCase()}:/${normalized.slice(2)}`;
        }
        return `local://${encodeURI(normalized)}`;
    }
}
