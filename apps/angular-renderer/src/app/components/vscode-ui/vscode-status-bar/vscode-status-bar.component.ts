import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatusBarItem {
    text: string;
    icon?: string;
}

export interface StatusBarItems {
    left?: StatusBarItem[];
    right?: StatusBarItem[];
}

@Component({
    selector: 'app-vscode-status-bar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="bg-blue-600 text-white text-xs px-3 py-1 flex items-center justify-between border-t border-gray-700" [ngClass]="className">
      <div class="flex items-center gap-4">
        <div *ngFor="let item of items.left" class="flex items-center gap-1 cursor-pointer hover:bg-blue-500/50 px-1 py-0.5 rounded">
          <span *ngIf="item.icon" [innerHTML]="item.icon"></span>
          <span>{{item.text}}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div *ngFor="let item of items.right" class="flex items-center gap-1 cursor-pointer hover:bg-blue-500/50 px-1 py-0.5 rounded">
          <span *ngIf="item.icon" [innerHTML]="item.icon"></span>
          <span>{{item.text}}</span>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class VscodeStatusBarComponent {
    @Input() items: StatusBarItems = { left: [], right: [] };
    @Input() className: string = '';
}
