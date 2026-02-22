import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-vscode-sidebar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="vscode-sidebar" [ngClass]="className">
      <div class="vscode-panel-content border-b border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wide mb-2">{{title}}</div>
      </div>
      <div class="flex-1 overflow-auto vscode-scrollbar">
        <ng-content></ng-content>
      </div>
    </div>
  `,
    styles: []
})
export class VscodeSidebarComponent {
    @Input() title: string = '';
    @Input() className: string = '';
}
