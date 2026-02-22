import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
    selector: 'app-activity-bar-icon',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    template: `
    <div 
      class="vscode-activity-icon"
      [ngClass]="{'active': active}"
      (click)="onClick.emit()"
      [title]="label"
    >
      <div class="icon text-lg mb-1 flex items-center justify-center h-8 w-8">
        <ng-icon *ngIf="icon" [name]="icon" size="24"></ng-icon>
        <ng-content *ngIf="!icon" select="[icon]"></ng-content>
      </div>
      <div *ngIf="label" class="label">{{label}}</div>
      <div *ngIf="badge" class="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
        {{badge}}
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .vscode-activity-icon {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .vscode-activity-icon.active { opacity: 1; border-left: 2px solid #fff; }
    .vscode-activity-icon:hover { opacity: 1; }
    .label { font-size: 10px; margin-top: 2px; }
  `]
})
export class ActivityBarIconComponent {
    @Input() icon: string = '';
    @Input() label: string = '';
    @Input() active: boolean = false;
    @Input() badge: number | string | null = null;

    @Output() onClick = new EventEmitter<void>();
}
