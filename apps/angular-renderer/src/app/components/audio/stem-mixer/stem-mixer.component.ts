import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MixerViewModel } from '../../../viewmodels/mixer.viewmodel';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroPlaySolid,
    heroStopSolid,
    heroSpeakerWaveSolid,
    heroSpeakerXMarkSolid,
    heroMicrophoneSolid,
    heroMusicalNoteSolid,
    heroAdjustmentsHorizontalSolid,
    heroClockSolid,
    heroChatBubbleBottomCenterTextSolid,
    heroBoltSolid
} from '@ng-icons/heroicons/solid';

@Component({
    selector: 'app-stem-mixer',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent],
    templateUrl: './stem-mixer.component.html',
    styleUrl: './stem-mixer.component.scss',
    providers: [
        provideIcons({
            heroPlaySolid,
            heroStopSolid,
            heroSpeakerWaveSolid,
            heroSpeakerXMarkSolid,
            heroMicrophoneSolid,
            heroMusicalNoteSolid,
            heroAdjustmentsHorizontalSolid,
            heroClockSolid,
            heroChatBubbleBottomCenterTextSolid,
            heroBoltSolid
        })
    ]
})
export class StemMixerComponent implements OnInit {
    vm = inject(MixerViewModel);

    ngOnInit() {
        // Initialization logic if any
    }

    getTrackIcon(name: string): string {
        const lower = name.toLowerCase();
        if (lower.includes('voc')) return 'heroMicrophoneSolid';
        if (lower.includes('click') || lower.includes('metronome')) return 'heroClockSolid';
        if (lower.includes('cue') || lower.includes('guide')) return 'heroChatBubbleBottomCenterTextSolid';
        if (lower.includes('drum') || lower.includes('perc')) return 'heroBoltSolid';
        return 'heroMusicalNoteSolid';
    }
}
