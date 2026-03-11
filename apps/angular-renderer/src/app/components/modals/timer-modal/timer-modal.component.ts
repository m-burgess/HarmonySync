import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroXMark, heroClock } from '@ng-icons/heroicons/outline';
import { VSCodeModalComponent } from '../../vscode-ui/modal/modal.component';
import { CreateTimerRequest } from '../../../models/timer.models';

export interface TimerModalData {
    displays: any[];
    title: string;
}

@Component({
    selector: 'app-timer-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent, VSCodeModalComponent],
    providers: [
        provideIcons({ heroCheck, heroXMark, heroClock })
    ],
    templateUrl: './timer-modal.html'
})
export class TimerModalComponent {
    name = signal<string>('New Timer');
    durationMinutes = signal<number>(5);
    selectedDisplays = signal<Set<string>>(new Set(['confidence']));

    constructor(
        public dialogRef: DialogRef<CreateTimerRequest | null>,
        @Inject(DIALOG_DATA) public data: TimerModalData
    ) { }

    toggleDisplay(displayId: string) {
        const current = new Set(this.selectedDisplays());
        if (current.has(displayId)) {
            current.delete(displayId);
        } else {
            current.add(displayId);
        }
        this.selectedDisplays.set(current);
    }

    save() {
        if (!this.name().trim() || this.durationMinutes() <= 0) return;

        this.dialogRef.close({
            name: this.name().trim(),
            durationMinutes: this.durationMinutes(),
            targetDisplays: Array.from(this.selectedDisplays())
        });
    }

    close() {
        this.dialogRef.close(null);
    }
}
