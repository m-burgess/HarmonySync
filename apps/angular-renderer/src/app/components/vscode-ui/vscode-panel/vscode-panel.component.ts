import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vscode-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vscode-panel-content" [ngClass]="className">
      <div *ngIf="title" class="vscode-panel-header">{{title}}</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class VSCodePanelComponent {
  @Input() title: string = '';
  @Input() className: string = '';
}
