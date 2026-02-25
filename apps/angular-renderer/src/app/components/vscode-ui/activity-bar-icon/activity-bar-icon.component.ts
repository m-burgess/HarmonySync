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
    :host { display: block; width: 100%; }
    .vscode-activity-icon {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding: 12px 0;
      color: #858585;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      group: hover;
    }
    .vscode-activity-icon.active { 
      color: #ffffff;
      background: linear-gradient(90deg, rgba(0, 122, 204, 0.1) 0%, transparent 100%);
    }
    .vscode-activity-icon.active::after {
      content: '';
      position: absolute;
      left: 0;
      top: 20%;
      bottom: 20%;
      width: 2px;
      background: #007acc;
      box-shadow: 0 0 8px rgba(0, 122, 204, 0.6);
      border-radius: 0 2px 2px 0;
    }
    .vscode-activity-icon:hover { 
      color: #cccccc;
      background: rgba(255, 255, 255, 0.03);
    }
    .icon {
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .vscode-activity-icon:hover .icon {
      transform: scale(1.1);
    }
    .vscode-activity-icon:active .icon {
      transform: scale(0.95);
    }
    .label { 
      font-size: 9px; 
      margin-top: 4px; 
      font-weight: 500;
      letter-spacing: 0.02em;
      opacity: 0.8;
    }
  `]
})
export class ActivityBarIconComponent {
  @Input() icon: string = '';
  @Input() label: string = '';
  @Input() active: boolean = false;
  @Input() badge: number | string | null = null;

  @Output() onClick = new EventEmitter<void>();
}
