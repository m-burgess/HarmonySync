import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MixerViewModel } from '../../../viewmodels/mixer.viewmodel';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroPlaySolid,
    heroStopSolid,
    heroSpeakerWaveSolid,
    heroSpeakerXMarkSolid,
    heroMicrophoneSolid,
    heroMusicalNoteSolid,
    heroAdjustmentsHorizontalSolid
} from '@ng-icons/heroicons/solid';

@Component({
    selector: 'app-stem-mixer',
    standalone: true,
    imports: [CommonModule, FormsModule, VSCodePanelComponent, NgIconComponent],
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
            heroAdjustmentsHorizontalSolid
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
        if (lower.includes('voc') || lower.includes('guide')) return 'heroMicrophoneSolid';
        return 'heroMusicalNoteSolid';
    }
}
