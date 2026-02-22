import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tab {
    label: string;
    icon?: string;
}

@Component({
    selector: 'app-vscode-tabs',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="vscode-tabs" [ngClass]="className">
      <div 
        *ngFor="let tab of tabs; let i = index"
        class="vscode-tab"
        [ngClass]="{'active': activeTab === i}"
        (click)="onTabClick.emit(i)"
      >
        <span *ngIf="tab.icon" class="mr-2" [innerHTML]="tab.icon"></span>
        <span>{{tab.label}}</span>
      </div>
    </div>
  `,
    styles: []
})
export class VscodeTabsComponent {
    @Input() tabs: Tab[] = [];
    @Input() activeTab: number = 0;
    @Input() className: string = '';

    @Output() onTabClick = new EventEmitter<number>();
}
