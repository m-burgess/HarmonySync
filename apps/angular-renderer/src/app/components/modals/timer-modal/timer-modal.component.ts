import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../vscode-ui/modal/modal.component';
import { VSCodeButtonComponent } from '../../vscode-ui/vscode-button/vscode-button.component';
import { VSCodeInputComponent } from '../../vscode-ui/vscode-input/vscode-input.component';

export interface Timer {
    id?: string;
    name: string;
    durationMinutes: number;
    targetDisplays: string[];
    status?: 'stopped' | 'running' | 'paused';
}

@Component({
    selector: 'app-timer-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, VSCodeButtonComponent, VSCodeInputComponent],
    templateUrl: './timer-modal.component.html',
    styleUrl: './timer-modal.component.scss'
})
export class TimerModalComponent implements OnInit {
    @Input() isOpen = false;
    @Input() timer: Timer | null = null;
    @Input() displays: any[] = [];
    @Input() title = 'Create Timer';

    @Output() onClose = new EventEmitter<void>();
    @Output() onSave = new EventEmitter<Omit<Timer, 'id' | 'status'>>();

    name = '';
    hours = '0';
    minutes = '5';
    selectedDisplays: string[] = [];
    isSaving = false;
    error: string | null = null;

    ngOnInit() {
        this.resetForm();
    }

    ngOnChanges() {
        if (this.isOpen) {
            this.resetForm();
        }
    }

    resetForm() {
        if (this.timer) {
            this.name = this.timer.name;
            this.hours = Math.floor(this.timer.durationMinutes / 60).toString();
            this.minutes = (this.timer.durationMinutes % 60).toString();
            this.selectedDisplays = [...(this.timer.targetDisplays || [])];
        } else {
            this.name = '';
            this.hours = '0';
            this.minutes = '5';
            this.selectedDisplays = [];
        }
        this.error = null;
    }

    handleDisplayToggle(displayId: string) {
        const index = this.selectedDisplays.indexOf(displayId);
        if (index > -1) {
            this.selectedDisplays.splice(index, 1);
        } else {
            this.selectedDisplays.push(displayId);
        }
    }

    validate(): string | null {
        if (!this.name.trim()) return 'Timer name is required';
        const h = parseInt(this.hours) || 0;
        const m = parseInt(this.minutes) || 0;
        if (h < 0 || m < 0) return 'Duration cannot be negative';
        if (h === 0 && m === 0) return 'Duration must be greater than 0';
        if (h > 23 || m > 59) return 'Invalid time format';
        return null;
    }

    async handleSave() {
        const validationError = this.validate();
        if (validationError) {
            this.error = validationError;
            return;
        }

        this.isSaving = true;
        this.error = null;

        const h = parseInt(this.hours) || 0;
        const m = parseInt(this.minutes) || 0;

        this.onSave.emit({
            name: this.name.trim(),
            durationMinutes: h * 60 + m,
            targetDisplays: this.selectedDisplays
        });

        this.isSaving = false;
    }
}
