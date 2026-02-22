import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ListItem {
    label?: string;
    text?: string;
    icon?: string;
    selected?: boolean;
    [key: string]: any;
}

@Component({
    selector: 'app-vscode-list',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="vscode-list" [ngClass]="className">
      <div 
        *ngFor="let item of items; let i = index"
        class="vscode-list-item"
        [ngClass]="{'selected': item.selected}"
        (click)="onItemClick.emit({item: item, index: i})"
      >
        <span *ngIf="item.icon" class="mr-2 text-sm" [innerHTML]="item.icon"></span>
        <span>{{item.label || item.text}}</span>
      </div>
    </div>
  `,
    styles: []
})
export class VscodeListComponent {
    @Input() items: ListItem[] = [];
    @Input() className: string = '';

    @Output() onItemClick = new EventEmitter<{ item: ListItem, index: number }>();
}
