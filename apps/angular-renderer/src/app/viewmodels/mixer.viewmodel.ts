import { inject, Injectable, signal, computed } from '@angular/core';
import { AudioService } from '../core/audio.service';
import { Track } from '../models/audio.models';

@Injectable({
    providedIn: 'root'
})
export class MixerViewModel {
    public audioService = inject(AudioService);

    // Expose signals from service or wrap them
    tracks = this.audioService.tracks;
    isPlaying = this.audioService.isPlaying;
    isLoading = this.audioService.isLoading;
    error = this.audioService.error;
    globalVolume = signal<number>(1.0);

    // Track priority for sorting
    private readonly TRACK_PRIORITY = ['click', 'guide', 'metronome'];

    // Computed
    hasTracks = computed(() => this.tracks().length > 0);

    sortedTracks = computed(() => {
        return [...this.tracks()].sort((a, b) => {
            const aPriority = this.getTrackPriority(a.name);
            const bPriority = this.getTrackPriority(b.name);

            if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
            if (aPriority !== -1) return -1;
            if (bPriority !== -1) return 1;

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    });

    canPlay = computed(() => this.hasTracks() && !this.isPlaying() && !this.isLoading());
    canStop = computed(() => this.isPlaying());

    private getTrackPriority(name: string): number {
        const lower = name.toLowerCase();
        return this.TRACK_PRIORITY.findIndex(keyword => lower.includes(keyword));
    }

    // Actions
    toggleMute(trackId: string) {
        this.audioService.toggleMute(trackId);
    }

    saveMix() {
        this.audioService.saveMixerConfig();
    }

    setVolume(trackId: string, volume: number) {
        this.audioService.setTrackVolume(trackId, volume);
    }

    setGlobalVolume(volume: number) {
        this.globalVolume.set(volume);
        this.audioService.setGlobalVolume(volume);
    }

    setPan(trackId: string, pan: number) {
        this.audioService.setTrackPan(trackId, pan);
    }

    play() {
        this.audioService.play().subscribe();
    }

    stop() {
        this.audioService.stop().subscribe();
    }

    pause() {
        this.audioService.pause().subscribe();
    }

    formatTrackName(name: string): string {
        return name
            .replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '')
            .replace(/[-_]/g, ' ')
            .trim();
    }
}
