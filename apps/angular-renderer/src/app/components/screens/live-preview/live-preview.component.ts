import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideService } from '../../../core/slide.service';
import { ServiceOrderService } from '../../../core/service-order.service';
import { ElectronService } from '../../../core/electron.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroComputerDesktopSolid, heroSignalSolid } from '@ng-icons/heroicons/solid';

@Component({
    selector: 'app-live-preview',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    template: `
    <div class="live-preview-container bg-black rounded-lg border border-[#333] overflow-hidden shadow-2xl relative aspect-video group">
      <!-- High-Fidelity Signal Indicator -->
      <div class="absolute top-3 left-3 z-30 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10">
        <div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
        <span class="text-[9px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
          <ng-icon name="heroSignalSolid" class="text-[10px]"></ng-icon> LIVE OUTPUT
        </span>
      </div>

      <!-- Resolution Badge -->
      <div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-[8px] font-mono text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/20">4K / 60FPS</span>
      </div>

      <!-- Background Layer (Current Slide) -->
      <div class="absolute inset-0 z-0">
        @if (currentSlide()) {
          @if (currentSlide()?.type === 'image' || currentSlide()?.type === 'video') {
            <img [src]="currentSlideSrc()" class="w-full h-full object-cover opacity-80" />
          }
        } @else {
          <div class="w-full h-full bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center">
             <ng-icon name="heroComputerDesktopSolid" class="text-4xl text-white/5"></ng-icon>
          </div>
        }
      </div>

      <!-- Lyrics Overlay -->
      <div class="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
        @if (currentLyrics()) {
          <div class="text-white font-bold drop-shadow-lg leading-tight animate-in fade-in slide-in-from-bottom-2 duration-500"
               [style.font-size.px]="14"
               [style.text-shadow]="'0 0 10px rgba(0,0,0,0.8)'">
            {{ currentLyrics() }}
          </div>
        }
      </div>

      <!-- Scanline / Noise Effect -->
      <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-20"></div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .live-preview-container {
      background: #050505;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
  `],
    providers: [
        provideIcons({ heroComputerDesktopSolid, heroSignalSolid })
    ]
})
export class LivePreviewComponent {
    private slideService = inject(SlideService);
    private serviceOrderService = inject(ServiceOrderService);
    private electron = inject(ElectronService);

    currentSlide = this.slideService.currentSlide;

    // Logic to get current lyrics line being displayed
    // For now, let's just show the first line of current lyrics if available
    currentLyrics = computed(() => {
        const song = this.serviceOrderService.currentSong();
        if (!song || !song.lyrics) return '';
        // Actually, we want to know WHICH slide/lyric is selected.
        // This depends on how the service-order-manager handles lyric selection.
        return ''; // Placeholder
    });

    currentSlideSrc() {
        const slide = this.currentSlide();
        if (!slide) return '';
        if (slide.type === 'video' && slide.thumbnail_path) {
            return this.electron.convertFileSrc(slide.thumbnail_path);
        }
        return slide.path ? this.electron.convertFileSrc(slide.path) : '';
    }
}
