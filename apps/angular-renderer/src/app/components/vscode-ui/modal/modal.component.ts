import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-vscode-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ heroXMark })],
  template: `
    <div class="vscode-modal-container" [ngClass]="[sizeClasses, className]">
      <!-- Header -->
      <div class="vscode-modal-header" *ngIf="title || hasHeaderSlot">
        <div class="flex-1">
          <h2 class="title" *ngIf="title && !hasHeaderSlot">{{ title }}</h2>
          <ng-content select="[header]"></ng-content>
        </div>
        <button class="close-btn" (click)="onClose.emit()">
          <ng-icon name="heroXMark"></ng-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="vscode-modal-body custom-scrollbar" [ngClass]="bodyClassName">
        <ng-content></ng-content>
      </div>

      <!-- Footer -->
      <div class="vscode-modal-footer" *ngIf="showFooter">
        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .vscode-modal-container {
      background-color: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      color: var(--vscode-text);
      overflow: hidden;
      margin: 0 auto;
      height: auto;
      max-height: 95vh;
      border-radius: 4px;
      animation: modal-enter 0.15s cubic-bezier(0, 0, 0.2, 1);
    }

    @keyframes modal-enter {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .vscode-modal-header {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--vscode-bg-secondary);
      border-bottom: 1px solid var(--vscode-border);
      
      .title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin: 0;
        color: var(--vscode-text-secondary);
      }
      
      .close-btn {
        background: transparent;
        border: none;
        color: var(--vscode-text-secondary);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        transition: all 0.1s;
        
        &:hover {
          color: var(--vscode-text);
          background-color: var(--vscode-list-hover);
        }
      }
    }

    .vscode-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    }

    .vscode-modal-footer {
      padding: 12px 16px;
      background-color: var(--vscode-bg-secondary);
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Size Variations */
    .size-small { width: 400px; }
    .size-medium { width: 600px; }
    .size-large { width: 850px; }
    .size-full { width: 95vw; height: 90vh; }
    .size-auto { width: auto; min-width: 300px; max-width: 90vw; }
  `]
})
export class VSCodeModalComponent {
  @Input() title: string = '';
  @Input() size: 'small' | 'medium' | 'large' | 'full' | 'auto' = 'medium';
  @Input() showFooter: boolean = true;
  @Input() className: string = '';
  @Input() bodyClassName: string = '';
  @Output() onClose = new EventEmitter<void>();

  @Input() hasHeaderSlot: boolean = false;

  get sizeClasses(): string {
    return `size-${this.size}`;
  }
}
