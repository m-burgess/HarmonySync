import { Component, HostListener, Inject, PLATFORM_ID, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ServiceOrderComponent } from '../service-order/service-order/service-order.component';
import { SlideGridComponent } from '../slides/slide-grid/slide-grid.component';
import { LyricsColumnComponent } from '../lyrics/lyrics-column/lyrics-column.component';
import { ActivityBarIconComponent } from '../vscode-ui/activity-bar-icon/activity-bar-icon.component';
import { StemMixerComponent } from '../audio/stem-mixer/stem-mixer.component';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ElectronService } from '../../core/electron.service';
import { ServiceOrderService } from '../../core/service-order.service';
import { SlideService } from '../../core/slide.service';
import { DisplayService } from '../../core/display.service';
import { TimerService } from '../../core/timer.service';
import { ConfigService } from '../../core/config.service';
import { CreateTimerRequest } from '../../models/timer.models';
import { SettingsComponent } from '../settings/settings.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPresentationChartBar, heroClock, heroCog, heroComputerDesktop, heroTv, heroQueueList, heroAdjustmentsHorizontal, heroBolt, heroCalendarDays, heroCodeBracket, heroMusicalNote, heroPlay, heroPlus } from '@ng-icons/heroicons/outline';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        CommonModule,
        StemMixerComponent,
        ServiceOrderComponent,
        SlideGridComponent,
        LyricsColumnComponent,
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
            heroCodeBracket,
            heroMusicalNote,
            heroPlay,
            heroPlus
        })
    ],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
    // Services
    serviceOrderService = inject(ServiceOrderService);
    slideService = inject(SlideService);
    displayService = inject(DisplayService);
    timerService = inject(TimerService);
    electronService = inject(ElectronService);
    configService = inject(ConfigService);
    private dialog = inject(Dialog);

    // Presentation state
    currentLyrics = computed(() => this.serviceOrderService.currentSong()?.lyrics || null);
    currentSongMap = computed(() => this.serviceOrderService.currentSong()?.songMap || null);
    currentItemType = computed(() => this.serviceOrderService.currentSong()?.type || null);

    isLoadingTracks = computed(() => this.serviceOrderService.isLoading());
    isTimerActive = computed(() => this.timerService.timers().some(t => t.status === 'running'));
    runningTimersCount = computed(() => {
        const count = this.timerService.timers().filter(t => t.status === 'running').length;
        return count > 0 ? count : null;
    });

    ngOnInit() {
        if (this.electronService.isElectron) {
            this.displayService.refreshDisplays().subscribe();
        }
    }
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
    
    openPreferences() {
        this.dialog.open(SettingsComponent, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1200px',
            maxHeight: '900px',
            panelClass: ['bg-transparent', 'shadow-2xl', 'rounded-2xl', 'overflow-hidden'],
            hasBackdrop: true,
            backdropClass: 'bg-black/80'
        });
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
