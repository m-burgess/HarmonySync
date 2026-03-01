import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ConfidenceViewModel } from '../../../viewmodels/confidence.viewmodel';

type LyricsContent = { type: 'lyrics'; text: string[] };
type ImageContent = { type: 'image'; path: string; name: string };
type VideoContent = { type: 'video'; videoId: string };
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
export class ConfidenceMonitorComponent {
    vm = inject(ConfidenceViewModel);
    private titleService = inject(Title);

    ngOnInit() {
        this.titleService.setTitle('Stage Monitor');
    }
}

