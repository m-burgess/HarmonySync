import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';

type LyricsContent = { type: 'lyrics'; text: string[] };
type ImageContent = { type: 'image'; path?: string; name?: string };
type VideoContent = { type: 'video'; path?: string; duration?: number };
type SlideContent = LyricsContent | ImageContent | VideoContent | any;

interface TimerState {
    active: boolean;
    elapsed: number;
    total: number;
}

@Component({
    selector: 'app-confidence-monitor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confidence-monitor.component.html',
    styleUrl: './confidence-monitor.component.scss'
})
export class ConfidenceMonitorComponent implements OnInit, OnDestroy {
    currentTime: string = '';
    currentSlide: SlideContent | null = null;
    nextSlide: SlideContent | null = null;
    isImageDisplay: boolean = false;
    videoCountdown: string | null = null;
    timer: TimerState = { active: false, elapsed: 0, total: 0 };
    timerEnabled: boolean = false;

    private clockInterval: any = null;
    private unlisteners: (() => void)[] = [];

    constructor(private electronService: ElectronService) { }

    ngOnInit() {
        this.startClock();
        this.setupEventListeners();
    }

    ngOnDestroy() {
        this.cleanup();
    }

    private startClock() {
        const update = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = String(hours % 12 || 12);
            this.currentTime = `${displayHours}:${minutes} ${ampm}`;
        };
        update();
        this.clockInterval = setInterval(update, 1000);
    }

    private setupEventListeners() {
        const ulLyrics = this.electronService.on('display-confidence-lyrics', (payload: any) => {
            console.log('Confidence: display-confidence-lyrics received', payload);
            this.currentSlide = { type: 'lyrics', text: payload.current || [] };
            this.nextSlide = { type: 'lyrics', text: payload.next || [] };
            this.isImageDisplay = false;
            this.videoCountdown = null;
        });
        if (ulLyrics) this.unlisteners.push(ulLyrics);

        const ulClear = this.electronService.on('clear-confidence-display', () => {
            console.log('Confidence: clear-confidence-display received');
            this.currentSlide = null;
            this.nextSlide = null;
            this.isImageDisplay = false;
            this.videoCountdown = null;
        });
        if (ulClear) this.unlisteners.push(ulClear);

        const ulVideoProgress = this.electronService.on('video-progress', (payload: any) => {
            const { currentTime, duration } = payload;
            if (duration) {
                const remaining = duration - currentTime;
                const mins = Math.floor(remaining / 60);
                const secs = Math.floor(remaining % 60).toString().padStart(2, '0');
                this.videoCountdown = `${mins}:${secs}`;
            }
        });
        if (ulVideoProgress) this.unlisteners.push(ulVideoProgress);

        // Timer listeners
        const ulTStart = this.electronService.on('timer-started', (p: any) => this.timer = { active: true, elapsed: 0, total: p.total });
        if (ulTStart) this.unlisteners.push(ulTStart);

        const ulTUpdate = this.electronService.on('timer-update', (p: any) => this.timer = { active: true, elapsed: p.elapsed, total: p.total });
        if (ulTUpdate) this.unlisteners.push(ulTUpdate);

        const ulTStop = this.electronService.on('timer-stopped', () => this.timer = { active: false, elapsed: 0, total: 0 });
        if (ulTStop) this.unlisteners.push(ulTStop);

        const ulTEnable = this.electronService.on('confidence-timer-enable', () => this.timerEnabled = true);
        if (ulTEnable) this.unlisteners.push(ulTEnable);

        const ulTDisable = this.electronService.on('confidence-timer-disable', () => this.timerEnabled = false);
        if (ulTDisable) this.unlisteners.push(ulTDisable);
    }

    private cleanup() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.unlisteners.forEach(u => u());
    }

    get isLyricsMode(): boolean { return this.currentSlide?.type === 'lyrics'; }
    get isVideoMode(): boolean { return this.currentSlide?.type === 'video'; }

    get timerDisplay() {
        if (!this.timer.active || this.timer.total === 0) return null;
        const remaining = Math.max(0, this.timer.total - this.timer.elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = (remaining % 60).toString().padStart(2, '0');
        const percentage = (this.timer.elapsed / this.timer.total) * 100;

        let colorClass = '';
        if (percentage >= 90) colorClass = 'timer-critical';
        else if (percentage >= 75) colorClass = 'timer-warning';

        return { time: `${mins}:${secs}`, colorClass };
    }
}
