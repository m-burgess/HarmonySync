import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';

@Component({
    selector: 'app-lower-thirds-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './lower-thirds-screen.component.html',
    styleUrl: './lower-thirds-screen.component.scss'
})
export class LowerThirdsScreenComponent implements OnInit, OnDestroy {
    line1: string = 'Line 1';
    line2: string = 'Line 2';

    private unlisteners: (() => void)[] = [];

    constructor(private electronService: ElectronService) { }

    ngOnInit() {
        const unlisten = this.electronService.on('set-lower-thirds-text', (payload: any) => {
            this.line1 = payload.line1;
            this.line2 = payload.line2;
        });
        if (unlisten) this.unlisteners.push(unlisten);
    }

    ngOnDestroy() {
        this.unlisteners.forEach(u => u());
    }
}
