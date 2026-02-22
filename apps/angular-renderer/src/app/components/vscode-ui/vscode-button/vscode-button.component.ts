import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-vscode-button',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <button 
      class="vscode-button"
      [ngClass]="[variantClasses[variant], className]"
      [disabled]="disabled"
      [title]="title"
      (click)="onClick.emit($event)"
    >
      <span *ngIf="icon" class="flex items-center">
        <ng-icon [name]="icon" class="mr-2"></ng-icon>
        <ng-content></ng-content>
      </span>
      <ng-content *ngIf="!icon"></ng-content>
    </button>
  `,
  styles: []
})
export class VSCodeButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'icon' = 'primary';
  @Input() disabled: boolean = false;
  @Input() className: string = '';
  @Input() title: string = '';
  @Input() icon: string = '';

  @Output() onClick = new EventEmitter<MouseEvent>();

  variantClasses: Record<string, string> = {
    primary: '',
    secondary: 'secondary',
    icon: 'vscode-button-icon'
  };
}
