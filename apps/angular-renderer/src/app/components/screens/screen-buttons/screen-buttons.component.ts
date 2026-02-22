import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VSCodeButtonComponent } from '../../vscode-ui/vscode-button/vscode-button.component';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
@Component({
    selector: 'app-screen-buttons',
    standalone: true,
    imports: [CommonModule, VSCodeButtonComponent],
    template: `
    <div [ngClass]="containerClasses">
      <div *ngIf="variant === 'activity'" class="flex flex-col gap-2 p-2">
        <app-vscode-button 
            variant="secondary" 
            className="w-full text-xs py-1" 
            title="Toggle Audience"
            icon="heroComputerDesktopSolid"
            (onClick)="toggleScreen('audience')">
          Audience
        </app-vscode-button>
        <app-vscode-button 
            variant="secondary" 
            className="w-full text-xs py-1" 
            title="Toggle Confidence"
            icon="heroTvSolid"
            (onClick)="toggleScreen('confidence')">
          Stage
        </app-vscode-button>
        <app-vscode-button 
            variant="secondary" 
            className="w-full text-xs py-1" 
            title="Open Timers"
            icon="heroClock"
            (onClick)="onOpenTimers.emit()">
          Timers
        </app-vscode-button>
      </div>
      
      <div *ngIf="variant !== 'activity'" class="flex gap-2">
         <button (click)="onOpenTimers.emit()" class="vscode-button secondary text-[10px] px-2 py-0.5">Timers</button>
      </div>
    </div>
  `,
    styles: []
})
export class ScreenButtonsComponent {
    @Input() variant: 'default' | 'activity' | 'toolbar' = 'default';
    @Output() onOpenTimers = new EventEmitter<void>();
    @Output() onToggleScreen = new EventEmitter<string>();

    get containerClasses() {
        return this.variant === 'activity' ? 'w-full px-1' : 'flex items-center gap-2';
    }

    // Connect this with window getters later
    toggleScreen(screenType: string) {
        this.onToggleScreen.emit(screenType);
    }
}
