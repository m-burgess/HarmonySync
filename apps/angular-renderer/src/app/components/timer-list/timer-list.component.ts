
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerService } from '../../core/timer.service';
import { Timer } from '../../models/timer.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroPlay,
    heroPause,
    heroStop,
    heroArrowPath,
    heroTrash,
    heroPlus
} from '@ng-icons/heroicons/outline';
import { Dialog } from '@angular/cdk/dialog';
import { TimerModalComponent } from '../modals/timer-modal/timer-modal.component';
import { DisplayService } from '../../core/display.service';

@Component({
    selector: 'app-timer-list',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    template: `
    <div class="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none">
      <!-- Header -->
      <div class="p-4 border-b border-[#3c3c3c] flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-[#858585]">Timers</h2>
        <button (click)="createNewTimer()" 
                class="hover:bg-[#37373d] p-1 rounded transition-colors text-[#cccccc]">
          <ng-icon name="heroPlus" class="text-lg"></ng-icon>
        </button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-auto custom-scrollbar">
        @if (timerService.isLoading()) {
          <div class="p-4 text-xs text-center text-[#858585]">Loading timers...</div>
        } @else if (timerService.timers().length === 0) {
          <div class="p-8 text-xs text-center text-[#858585]">
            No timers found.<br>Create one to get started.
          </div>
        } @else {
          <div class="divide-y divide-[#3c3c3c]">
            @for (timer of timerService.timers(); track timer.id) {
              <div class="p-4 hover:bg-[#2a2d2e] transition-colors group">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium truncate pr-2">{{ timer.name }}</span>
                  <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="timerService.deleteTimer(timer.id).subscribe()" 
                            class="hover:text-red-400 p-1" title="Delete">
                      <ng-icon name="heroTrash"></ng-icon>
                    </button>
                  </div>
                </div>

                <!-- Timer Display -->
                <div class="flex items-end justify-between">
                  <div class="flex flex-col">
                    <span class="text-2xl font-mono leading-none tracking-tighter"
                          [class.text-blue-400]="timer.status === 'running'"
                          [class.text-yellow-400]="timer.status === 'paused'">
                      {{ formatTime(timer.remainingMs || (timer.durationMinutes * 60 * 1000)) }}
                    </span>
                    <span class="text-[10px] text-[#858585] mt-1 uppercase">
                      {{ timer.status }} • {{ timer.durationMinutes }}m
                    </span>
                  </div>

                  <!-- Controls -->
                  <div class="flex items-center space-x-1">
                    @if (timer.status === 'running') {
                      <button (click)="timerService.pauseTimer(timer.id).subscribe()" 
                              class="w-8 h-8 flex items-center justify-center rounded bg-[#37373d] hover:bg-[#45454d] text-[#cccccc]">
                        <ng-icon name="heroPause"></ng-icon>
                      </button>
                    } @else {
                      <button (click)="timerService.startTimer(timer.id).subscribe()" 
                              class="w-8 h-8 flex items-center justify-center rounded bg-[#0e639c] hover:bg-[#1177bb] text-white">
                        <ng-icon name="heroPlay"></ng-icon>
                      </button>
                    }

                    <button (click)="timerService.stopTimer(timer.id).subscribe()" 
                            class="w-8 h-8 flex items-center justify-center rounded border border-[#3c3c3c] hover:bg-[#37373d]">
                      <ng-icon name="heroStop"></ng-icon>
                    </button>
                    
                    <button (click)="timerService.resetTimer(timer.id).subscribe()" 
                            class="w-8 h-8 flex items-center justify-center rounded border border-[#3c3c3c] hover:bg-[#37373d]"
                            title="Reset">
                      <ng-icon name="heroArrowPath"></ng-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #3e3e3e;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
  `],
    providers: [
        provideIcons({
            heroPlay,
            heroPause,
            heroStop,
            heroArrowPath,
            heroTrash,
            heroPlus
        })
    ]
})
export class TimerListComponent {
    readonly timerService = inject(TimerService);
    private readonly dialog = inject(Dialog);
    private readonly displayService = inject(DisplayService);

    formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    createNewTimer() {
        this.displayService.refreshDisplays();
        const dialogRef = this.dialog.open(TimerModalComponent, {
            data: {
                displays: this.displayService.displays(),
                title: 'Create Timer'
            },
            hasBackdrop: true,
            backdropClass: ['cdk-overlay-dark-backdrop', 'cdk-overlay-backdrop-showing']
        });

        dialogRef.closed.subscribe(result => {
            if (result) {
                this.timerService.createTimer(result as any).subscribe();
            }
        });
    }
}
