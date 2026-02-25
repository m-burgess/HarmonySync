import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../../core/audio.service';
import { SlideService } from '../../../core/slide.service';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroPlaySolid,
  heroStopSolid,
  heroSpeakerWaveSolid,
  heroSpeakerXMarkSolid,
  heroMicrophoneSolid,
  heroMusicalNoteSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-mixer-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, VSCodePanelComponent, NgIconComponent],
  templateUrl: './mixer-sidebar.html',
  styleUrl: './mixer-sidebar.scss',
  providers: [
    provideIcons({
      heroPlaySolid,
      heroStopSolid,
      heroSpeakerWaveSolid,
      heroSpeakerXMarkSolid,
      heroMicrophoneSolid,
      heroMusicalNoteSolid
    })
  ]
})
export class MixerSidebarComponent implements OnInit {
  audioService = inject(AudioService);
  slideService = inject(SlideService);

  readonly sortedTracks = computed(() => {
    const tracks = [...this.audioService.tracks()];
    return tracks.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      const isClickA = nameA.includes('click');
      const isClickB = nameB.includes('click');
      if (isClickA && !isClickB) return -1;
      if (!isClickA && isClickB) return 1;

      const isGuideA = nameA.includes('guide');
      const isGuideB = nameB.includes('guide');
      if (isGuideA && !isGuideB) return -1;
      if (!isGuideA && isGuideB) return 1;

      return nameA.localeCompare(nameB);
    });
  });

  ngOnInit() {
    this.audioService.connectWebSocket();
  }

  playAll() {
    this.audioService.play().subscribe();

    // Automatically play background video if available
    const currentSlides = this.slideService.slides();
    const videoIdx = currentSlides.findIndex(s => s.type === 'video');
    if (videoIdx !== -1) {
      this.slideService.selectSlide(videoIdx);
    }
  }

  stopAll() {
    this.audioService.stop().subscribe();
  }

  toggleMute(trackId: string) {
    this.audioService.toggleMute(trackId);
  }

  getTrackIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('voc') || lower.includes('guide')) return 'heroMicrophoneSolid';
    return 'heroMusicalNoteSolid';
  }
}
