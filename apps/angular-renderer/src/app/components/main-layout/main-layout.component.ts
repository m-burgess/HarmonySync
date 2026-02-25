import { Component, HostListener, Inject, PLATFORM_ID, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ServiceOrderManagerComponent } from '../service-order/service-order-manager/service-order-manager.component';
import { SlideManagerComponent } from '../slides/slide-manager/slide-manager.component';
import { LyricsColumnComponent } from '../lyrics/lyrics-column/lyrics-column.component';
import { ActivityBarIconComponent } from '../vscode-ui/activity-bar-icon/activity-bar-icon.component';
import { MixerSidebarComponent } from '../audio/mixer-sidebar/mixer-sidebar';
import { TimerModalComponent } from '../modals/timer-modal/timer-modal.component';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ElectronService } from '../../core/electron.service';
import { ServiceOrderService } from '../../core/service-order.service';
import { SlideService } from '../../core/slide.service';
import { DisplayService } from '../../core/display.service';
import { TimerService } from '../../core/timer.service';
import { ConfigService } from '../../core/config.service';
import { TimerListComponent } from '../timer-list/timer-list.component';
import { CreateTimerRequest } from '../../models/timer.models';
import { SettingsComponent } from '../settings/settings.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPresentationChartBar, heroClock, heroCog, heroComputerDesktop, heroTv, heroQueueList, heroAdjustmentsHorizontal, heroBolt, heroCalendarDays, heroCodeBracket } from '@ng-icons/heroicons/outline';
import { SchedulerComponent } from '../screens/scheduler/scheduler.component';
import { ScriptEditorComponent } from '../screens/script-editor/script-editor.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        CommonModule,
        ActivityBarIconComponent,
        MixerSidebarComponent,
        ServiceOrderManagerComponent,
        SlideManagerComponent,
        LyricsColumnComponent,
        TimerListComponent,
        SettingsComponent,
        SchedulerComponent,
        ScriptEditorComponent,
        NgIconComponent,
        DialogModule
    ],
    providers: [
        provideIcons({
            heroPresentationChartBar,
            heroClock,
            heroCog,
            heroComputerDesktop,
            heroTv,
            heroQueueList,
            heroAdjustmentsHorizontal,
            heroBolt,
            heroCalendarDays,
            heroCodeBracket
        })
    ],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
    DEFAULT_SIDEBAR_WIDTH = 300;
    DEFAULT_MIXER_WIDTH = 300;

    sidebarWidth = this.DEFAULT_SIDEBAR_WIDTH;
    mixerWidth = this.DEFAULT_MIXER_WIDTH;

    // Services
    serviceOrderService = inject(ServiceOrderService);
    slideService = inject(SlideService);
    displayService = inject(DisplayService);
    timerService = inject(TimerService);
    electronService = inject(ElectronService);
    configService = inject(ConfigService);
    private dialog = inject(Dialog);

    // Sidebar state
    activeSidebar = signal<'explorer' | 'timers' | 'settings'>('explorer');
    showScheduler = signal<boolean>(false);
    showScriptEditor = signal<boolean>(false);

    // Presentation state
    currentLyrics = computed(() => this.serviceOrderService.currentSong()?.lyrics || null);
    currentItemType = computed(() => this.serviceOrderService.currentSong()?.type || null);
    isLoadingTracks = computed(() => this.serviceOrderService.isLoading());
    isTimerActive = computed(() => this.timerService.timers().some(t => t.status === 'running'));
    runningTimersCount = computed(() => {
        const count = this.timerService.timers().filter(t => t.status === 'running').length;
        return count > 0 ? count : null;
    });

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

    isScreenActive(screenType: string): boolean {
        return this.displayService.windowStatus()[screenType]?.visible || false;
    }

    openAudioSettings() { console.log('Open Audio Settings'); }
    openDisplaySettings() { console.log('Open Display Settings'); }
    openPreferences() { this.activeSidebar.set('settings'); }

    setActiveSidebar(sidebar: 'explorer' | 'timers' | 'settings') {
        this.activeSidebar.set(sidebar);
    }

    openTimers() {
        this.activeSidebar.set('timers');
    }

    toggleScheduler() {
        this.showScheduler.set(!this.showScheduler());
    }

    toggleScriptEditor() {
        this.showScriptEditor.set(!this.showScriptEditor());
    }


    async handleSaveTimer(timer: CreateTimerRequest) {
        this.timerService.createTimer(timer).subscribe({
            next: () => {
                console.log('Timer saved successfully');
                // Could close a modal here if needed
            },
            error: (err) => {
                console.error('Failed to save timer:', err);
            }
        });
    }
}
