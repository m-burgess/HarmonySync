import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { VSCodeInputComponent } from '../../vscode-ui/vscode-input/vscode-input.component';
import { SlideItemComponent } from '../slide-item/slide-item.component';
import { SlideImportModalComponent } from '../slide-import-modal/slide-import-modal.component';
import { SlideViewModel } from '../../../viewmodels/slide.viewmodel';

@Component({
    selector: 'app-slide-grid',
    standalone: true,
    imports: [CommonModule, VSCodePanelComponent, VSCodeInputComponent, SlideItemComponent, SlideImportModalComponent],
    template: `
    <div class="h-full flex flex-col" id="slide-grid-container">
      <app-slide-import-modal 
        [isOpen]="isImportModalOpen" 
        (onClose)="isImportModalOpen = false"
        (onSlidesImported)="handleSlidesImported($event)">
      </app-slide-import-modal>

      <app-vscode-panel [title]="vm.hasSlides() ? 'Slides (' + vm.slideCount() + ')' : 'Slides'" className="pl-3 pt-3 pb-3 h-full flex flex-col">
        <!-- Grid Controls -->
        <div class="flex items-center justify-between mb-3 pr-3">
          <div class="flex items-center gap-4">
            <button
              (click)="openImportModal()"
              title="Import Slides"
              class="vscode-button secondary text-xs py-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1 inline">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Import
            </button>

            <div class="h-4 w-[1px] bg-white/10"></div>

            <div class="flex items-center gap-2">
              <label for="thumbnail-slider" class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Zoom</label>
              <app-vscode-input
                type="range"
                id="thumbnail-slider"
                min="120"
                max="480"
                [value]="thumbnailSize.toString()"
                (onChange)="setThumbnailSize($event)"
                className="w-32"
              ></app-vscode-input>
            </div>
          </div>

          <button
            (click)="vm.clearSlides()"
            title="Clear All Slides"
            class="vscode-button vscode-button-icon secondary opacity-50 hover:opacity-100 transition-opacity"
            *ngIf="vm.hasSlides()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        <!-- Slides Grid Area -->
        <div
          class="slides-grid flex-1 overflow-y-auto custom-scrollbar"
          [style.--slide-size]="thumbnailSize + 'px'"
        >
          <div class="grid-item" *ngFor="let slide of vm.slides(); let i = index">
            <app-slide-item
              [slide]="slide"
              [index]="i"
              [isSelected]="i === vm.currentSlideIndex()"
              (onSelect)="vm.selectSlide(i)"
              [thumbnailSize]="thumbnailSize"
            ></app-slide-item>
          </div>

          @if (!vm.hasSlides() && !vm.isLoading()) {
            <div class="col-span-full py-20 flex flex-col items-center justify-center opacity-20">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-20 h-20 mb-4">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
               </svg>
               <span class="text-sm font-bold uppercase tracking-widest">No Slides Loaded</span>
            </div>
          }
        </div>
      </app-vscode-panel>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    .slides-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--slide-size), 1fr));
      gap: 16px;
      padding: 4px 12px 12px 0;
      align-content: start;
    }
    .grid-item {
      aspect-ratio: 16 / 9;
      transition: transform 0.2s ease;
      &:active { transform: scale(0.98); }
    }
    .custom-scrollbar {
      &::-webkit-scrollbar { width: 8px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { 
        background: #333; 
        border-radius: 4px;
        &:hover { background: #444; }
      }
    }
  `]
})
export class SlideGridComponent {
    vm = inject(SlideViewModel);
    thumbnailSize = 220;
    isImportModalOpen = false;

    @HostListener('document:keydown', ['$event'])
    handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.vm.nextSlide();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            this.vm.previousSlide();
        }
    }

    setThumbnailSize(value: string) {
        this.thumbnailSize = parseInt(value, 10);
    }

    openImportModal() {
        this.isImportModalOpen = true;
    }

    handleSlidesImported(newSlides: any) {
        // Logic to handle imported slides if needed
        this.isImportModalOpen = false;
    }
}
