import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-vscode-tree-item',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div [ngClass]="className">
      <div 
        class="vscode-tree-item"
        [ngClass]="{'selected': selected}"
        (click)="onClick.emit()"
      >
        <button 
          *ngIf="hasChildren"
          class="vscode-tree-icon mr-1 w-4 h-4 flex items-center justify-center transform transition-transform"
          [ngClass]="{'rotate-90': expanded}"
          (click)="onToggleClick($event)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        <div *ngIf="!hasChildren" class="w-4 mr-1"></div>
        <span *ngIf="icon" class="vscode-tree-icon mr-2">
            <ng-content select="[icon]"></ng-content>
        </span>
        <span>{{label}}</span>
      </div>
      <div *ngIf="expanded && hasChildren" class="ml-4">
        <ng-content></ng-content>
      </div>
    </div>
  `,
    styles: []
})
export class VscodeTreeItemComponent {
    @Input() label: string = '';
    @Input() icon: boolean = false;
    @Input() selected: boolean = false;
    @Input() expanded: boolean = false;
    @Input() hasChildren: boolean = false;
    @Input() className: string = '';

    @Output() onClick = new EventEmitter<void>();
    @Output() onToggle = new EventEmitter<void>();

    onToggleClick(event: Event) {
        event.stopPropagation();
        this.onToggle.emit();
    }
}
