import { BrowserWindow, session } from 'electron';
import { BaseElectronService, ServiceConfig, PresentationManifest } from '@harmonysync/core';

export class PreserviceAutomationService extends BaseElectronService {
    protected readonly serviceName = 'PreserviceAutomationService';

    private musicWindow: BrowserWindow | null = null;
    private musicConfig: PresentationManifest['music'] | null = null;
    private startTimer: NodeJS.Timeout | null = null;
    private endTimer: NodeJS.Timeout | null = null;

    constructor(
        private getPreserviceMusicWindow: () => BrowserWindow | null,
        private displayService: any,
        private eventTriggerService: any,
        config?: ServiceConfig
    ) {
        super(config);
    }

    protected override async onInitialize(): Promise<void> {
        this.log('info', 'Preservice automation service initialized');
    }

    /**
     * Set the manifest data and schedule automation
     */
    public async scheduleFromManifest(manifest: PresentationManifest): Promise<void> {
        if (!manifest.music) {
            this.cancelSchedules();
            return;
        }

        this.musicConfig = manifest.music;
        this.log('info', `Scheduling pre-service music: ${this.musicConfig.playlist} (${this.musicConfig.start} - ${this.musicConfig.end})`);

        this.scheduleStart(this.musicConfig.start);
        this.scheduleEnd(this.musicConfig.end);
    }

    private scheduleStart(timeStr: string): void {
        if (this.startTimer) clearTimeout(this.startTimer);

        const startTime = this.parseTime(timeStr);
        const now = new Date();
        let delay = startTime.getTime() - now.getTime();

        if (delay < 0) {
            this.log('warn', 'Start time is in the past, starting immediately');
            delay = 0;
        }

        this.log('debug', `Starting music in ${Math.round(delay / 1000)}s`);
        this.startTimer = setTimeout(() => this.startMusic(), delay);
    }

    private scheduleEnd(timeStr: string): void {
        if (this.endTimer) clearTimeout(this.endTimer);

        const endTime = this.parseTime(timeStr);
        const now = new Date();
        const delay = endTime.getTime() - now.getTime();

        if (delay > 0) {
            this.log('debug', `Stopping music in ${Math.round(delay / 1000)}s`);
            this.endTimer = setTimeout(() => this.stopMusic(), delay);
        }
    }

    private async startMusic(): Promise<void> {
        if (!this.musicConfig) return;

        this.log('info', `Starting pre-service music: ${this.musicConfig.playlist}`);

        this.musicWindow = this.getPreserviceMusicWindow();
        if (this.musicWindow) {
            // Use persistent session for ad-free playback (if logged in)
            const musicSession = session.fromPartition('persist:preservice-music');

            // Navigate to playlist with shuffle and loop parameters if possible
            let url = this.musicConfig.playlist;
            // Simple YouTube shuffle/loop logic
            if (url.includes('youtube.com/playlist')) {
                url += '&shuffle=1';
            }

            this.musicWindow.show();
            await this.musicWindow.loadURL(url);

            // Potentially inject script to ensure loop/shuffle
            this.musicWindow.webContents.executeJavaScript(`
        setInterval(() => {
          const video = document.querySelector('video');
          if (video && video.ended) {
            // Find next or loop
          }
        }, 5000);
      `);
        }
    }

    private async stopMusic(): Promise<void> {
        this.log('info', 'Stopping pre-service music and starting countdown');

        if (this.musicWindow && !this.musicWindow.isDestroyed()) {
            this.musicWindow.hide();
            this.musicWindow.loadURL('about:blank');
        }

        // Play countdown video automatically on audience screen
        // We assume the first video slide with 'countdown' in title is the countdown
        // Or we trigger a specific event
        await this.eventTriggerService.emitTrigger('preservice-ended');

        this.log('info', 'Preservice music ended, countdown triggered');
    }

    private parseTime(timeStr: string): Date {
        const [time, modifier] = timeStr.split(/(am|pm)/i);
        let [hours, minutes] = time.split(':').map(Number);

        if (modifier?.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (modifier?.toLowerCase() === 'am' && hours === 12) hours = 0;

        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    private cancelSchedules(): void {
        if (this.startTimer) clearTimeout(this.startTimer);
        if (this.endTimer) clearTimeout(this.endTimer);
        this.musicConfig = null;
    }
}
