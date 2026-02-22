import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm" (click)="handleOverlayClick($event)">
      <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col" [ngClass]="sizeClasses">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
          <h2 class="text-lg font-bold text-white">{{ title }}</h2>
          <button (click)="onClose.emit()" class="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .size-small { width: 400px; }
    .size-medium { width: 600px; }
    .size-large { width: 800px; }
    .size-full { width: 95vw; height: 90vh; }
  `]
})
export class ModalComponent {
    @Input() isOpen = false;
    @Input() title = '';
    @Input() size: 'small' | 'medium' | 'large' | 'full' = 'medium';
    @Input() closeOnOverlayClick = true;
    @Output() onClose = new EventEmitter<void>();

    get sizeClasses() {
        return {
            'size-small': this.size === 'small',
            'size-medium': this.size === 'medium',
            'size-large': this.size === 'large',
            'size-full': this.size === 'full',
            'mx-4': true
        };
    }

    handleOverlayClick(event: MouseEvent) {
        if (this.closeOnOverlayClick && event.target === event.currentTarget) {
            this.onClose.emit();
        }
    }
}
