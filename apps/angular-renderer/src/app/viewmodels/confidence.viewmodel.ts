import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { ElectronService } from '../core/electron.service';
import { LyricTransitionService } from '../core/lyric-transition.service';

export type LyricsContent = { type: 'lyrics'; text: string[] };
export type ImageContent = { type: 'image'; path: string; name: string };
export type VideoContent = { type: 'video'; videoId: string };
export type SlideContent = LyricsContent | ImageContent | VideoContent | any;

export interface TimerState {
    active: boolean;
    elapsed: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class ConfidenceViewModel implements OnDestroy {
    private electron = inject(ElectronService);
    private transition = inject(LyricTransitionService);

    // Reactive State
    readonly currentTime = signal<string>('');
    readonly nextSlide = signal<SlideContent | null>(null);
    readonly videoCountdown = signal<string | null>(null);
    readonly timer = signal<TimerState>({ active: false, elapsed: 0, total: 0 });
    readonly timerEnabled = signal<boolean>(false);

    // Derived State
    readonly currentContent = computed(() => this.transition.currentContent());
    readonly contentOpacity = computed(() => this.transition.contentOpacity());

    readonly isLyricsMode = computed(() => this.currentContent()?.type === 'lyrics');
    readonly isVideoMode = computed(() => this.currentContent()?.type === 'video' || !!this.videoCountdown());

    readonly timerDisplay = computed(() => {
        const t = this.timer();
        if (!t.active || t.total === 0) return null;

        const remaining = Math.max(0, t.total - t.elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = (remaining % 60).toString().padStart(2, '0');
        const percentage = (t.elapsed / t.total) * 100;

        let colorClass = '';
        if (percentage >= 90) colorClass = 'timer-critical text-red-500';
        else if (percentage >= 75) colorClass = 'timer-warning text-yellow-500';
        else colorClass = 'text-green-500';

        return { time: `${mins}:${secs}`, colorClass };
    });

    private clockInterval: any = null;
    private unlisteners: (() => void)[] = [];

    constructor() {
        this.startClock();
        this.setupEventListeners();
        this.syncWithCurrentState();
    }

    private async syncWithCurrentState() {
        try {
            const state = await this.electron.invoke('display:getCurrentState');
            if (state) {
                if (state.slide) {
                    this.transition.transitionTo({ type: 'lyrics', text: state.slide.text || [] });
                }
                // videoCountdown handles video progress, no need to sync initial static video state here unless duration info is provided
            }
        } catch (error) {
            console.error('ConfidenceVM: failed to sync state', error);
        }
    }

    ngOnDestroy() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.unlisteners.forEach(u => u());
    }

    private startClock() {
        const update = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = String(hours % 12 || 12);
            this.currentTime.set(`${displayHours}:${minutes} ${ampm}`);
        };
        update();
        this.clockInterval = setInterval(update, 1000);
    }

    private setupEventListeners() {
        this.registerListener('display-confidence-lyrics', (payload: any) => {
            this.transition.transitionTo({ type: 'lyrics', text: payload.current || [] });
            this.nextSlide.set({ type: 'lyrics', text: payload.next || [] });
            this.videoCountdown.set(null);
        });

        this.registerListener('clear-confidence-display', () => {
            this.transition.clear();
            this.nextSlide.set(null);
            this.videoCountdown.set(null);
        });

        this.registerListener('video-progress', (payload: any) => {
            const { currentTime, duration } = payload;
            if (duration) {
                const remaining = duration - currentTime;
                const mins = Math.floor(remaining / 60);
                const secs = Math.floor(remaining % 60).toString().padStart(2, '0');
                this.videoCountdown.set(`${mins}:${secs}`);
            }
        });

        // Timers
        this.registerListener('timer-started', (p: any) =>
            this.timer.set({ active: true, elapsed: 0, total: p.total }));

        this.registerListener('timer-update', (p: any) =>
            this.timer.set({ active: true, elapsed: p.elapsed, total: p.total }));

        this.registerListener('timer-stopped', () =>
            this.timer.set({ active: false, elapsed: 0, total: 0 }));

        this.registerListener('confidence-timer-enable', () => this.timerEnabled.set(true));
        this.registerListener('confidence-timer-disable', () => this.timerEnabled.set(false));
    }

    private registerListener(event: string, callback: (payload: any) => void) {
        const unlistener = this.electron.on(event, callback);
        if (unlistener) this.unlisteners.push(unlistener);
    }
}
