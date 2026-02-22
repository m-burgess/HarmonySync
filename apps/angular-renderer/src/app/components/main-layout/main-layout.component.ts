import { Component, HostListener, Inject, PLATFORM_ID, OnInit, inject, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ServiceOrderManagerComponent } from '../service-order/service-order-manager/service-order-manager.component';
import { SlideManagerComponent } from '../slides/slide-manager/slide-manager.component';
import { LyricsColumnComponent } from '../lyrics/lyrics-column/lyrics-column.component';
import { ActivityBarIconComponent } from '../vscode-ui/activity-bar-icon/activity-bar-icon.component';
import { ScreenButtonsComponent } from '../screens/screen-buttons/screen-buttons.component';
import { MixerSidebarComponent } from '../audio/mixer-sidebar/mixer-sidebar';
import { TimerModalComponent } from '../modals/timer-modal/timer-modal.component';
import { ElectronService } from '../../core/electron.service';
import { ServiceOrderService } from '../../core/service-order.service';
import { SlideService } from '../../core/slide.service';
import { DisplayService } from '../../core/display.service';
@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        CommonModule,
        ActivityBarIconComponent,
        ScreenButtonsComponent,
        MixerSidebarComponent,
        ServiceOrderManagerComponent,
        SlideManagerComponent,
        LyricsColumnComponent,
        TimerModalComponent
    ],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
    DEFAULT_SIDEBAR_WIDTH = 300;
    DEFAULT_MIXER_WIDTH = 300;

    sidebarWidth = this.DEFAULT_SIDEBAR_WIDTH;
    mixerWidth = this.DEFAULT_MIXER_WIDTH;

    isTimerModalOpen = false;

    // Services
    serviceOrderService = inject(ServiceOrderService);
    slideService = inject(SlideService);
    displayService = inject(DisplayService);
    electronService = inject(ElectronService);

    // Presentation state
    currentLyrics = computed(() => this.serviceOrderService.currentSong()?.lyrics || null);
    isLoadingTracks = computed(() => this.serviceOrderService.isLoading());

    isBrowser: boolean;

    private draggingState: { type: string; startX: number; startWidth: number } | null = null;
    private rafId: number | null = null;

    constructor(
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);

        if (this.isBrowser) {
            const storedSidebar = localStorage.getItem('rp_sidebarWidth');
            if (storedSidebar && !isNaN(parseInt(storedSidebar, 10))) {
                this.sidebarWidth = parseInt(storedSidebar, 10);
            }

            const storedMixer = localStorage.getItem('rp_mixerWidth');
            if (storedMixer && !isNaN(parseInt(storedMixer, 10))) {
                this.mixerWidth = parseInt(storedMixer, 10);
            }
        }
    }

    ngOnInit() {
        if (this.electronService.isElectron) {
            this.displayService.refreshDisplays().subscribe();
        }
    }

    async refreshDisplays() {
        this.displayService.refreshDisplays().subscribe();
    }

    // VS Code style sidebar resizing
    startSidebarResize(e: MouseEvent) {
        e.preventDefault();
        this.draggingState = { type: 'sidebar', startX: e.clientX, startWidth: this.sidebarWidth };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    }

    resetSidebar() {
        this.sidebarWidth = this.DEFAULT_SIDEBAR_WIDTH;
        if (this.isBrowser) {
            localStorage.removeItem('rp_sidebarWidth');
        }
    }

    // Mixer sidebar resizing
    startMixerResize(e: MouseEvent) {
        e.preventDefault();
        this.draggingState = { type: 'mixer', startX: e.clientX, startWidth: this.mixerWidth };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    }

    resetMixer() {
        this.mixerWidth = this.DEFAULT_MIXER_WIDTH;
        if (this.isBrowser) {
            localStorage.removeItem('rp_mixerWidth');
        }
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        if (!this.draggingState) return;

        const dx = e.clientX - this.draggingState.startX;

        if (this.rafId) cancelAnimationFrame(this.rafId);

        this.rafId = requestAnimationFrame(() => {
            if (this.draggingState?.type === 'sidebar') {
                let newWidth = Math.max(200, Math.min(600, this.draggingState.startWidth + dx));
                this.sidebarWidth = newWidth;
                if (this.isBrowser) localStorage.setItem('rp_sidebarWidth', String(newWidth));
            } else if (this.draggingState?.type === 'mixer') {
                // Reversed because we're resizing from the left edge of the right sidebar
                let newWidth = Math.max(200, Math.min(600, this.draggingState.startWidth - dx));
                this.mixerWidth = newWidth;
                if (this.isBrowser) localStorage.setItem('rp_mixerWidth', String(newWidth));
            }
        });
    }

    @HostListener('window:mouseup')
    onMouseUp() {
        if (!this.draggingState) return;

        this.draggingState = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    // Presentation state handlers
    setAllTracks(tracks: any[], folderPath?: string) {
        console.log('Tracks loaded:', tracks.length, folderPath);
    }

    setIsLoadingTracks(loading: boolean) {
        // Handled by signal
    }

    // Actions
    toggleScreen(screenType: any) {
        if (this.electronService.isElectron) {
            this.displayService.toggleWindow(screenType).subscribe();
        } else {
            console.log('Toggling screen (Browser)', screenType);
        }
    }

    openAudioSettings() { console.log('Open Audio Settings'); }
    openDisplaySettings() { console.log('Open Display Settings'); }
    openPreferences() { console.log('Open Preferences'); }

    openTimers() {
        this.refreshDisplays();
        this.isTimerModalOpen = true;
    }

    async handleSaveTimer(timer: any) {
        try {
            await this.electronService.invoke('timer:create', timer);
            this.isTimerModalOpen = false;
        } catch (err) {
            console.error('Failed to save timer:', err);
        }
    }
}
