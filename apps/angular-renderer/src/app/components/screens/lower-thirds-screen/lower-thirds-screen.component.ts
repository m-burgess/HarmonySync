import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';
import { LyricTransitionService } from '../../../core/lyric-transition.service';
import { inject } from '@angular/core';

@Component({
    selector: 'app-lower-thirds-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './lower-thirds-screen.component.html',
    styleUrl: './lower-thirds-screen.component.scss'
})
export class LowerThirdsScreenComponent implements OnInit, OnDestroy {
    private transition = inject(LyricTransitionService);
    private unlisteners: (() => void)[] = [];

    constructor(private electronService: ElectronService) { }

    ngOnInit() {
        const unlisten = this.electronService.on('set-lower-thirds-text', (payload: any) => {
            this.transition.transitionTo({
                type: 'lyrics',
                text: [payload.line1, payload.line2]
            });
        });
        if (unlisten) this.unlisteners.push(unlisten);
    }

    get opacity() { return this.transition.contentOpacity(); }
    get line1() { return this.transition.currentContent()?.text?.[0] || ''; }
    get line2() { return this.transition.currentContent()?.text?.[1] || ''; }

    ngOnDestroy() {
        this.unlisteners.forEach(u => u());
    }
}
