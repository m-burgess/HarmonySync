import { Component, ElementRef, ViewChild, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { VSCodeInputComponent } from '../../vscode-ui/vscode-input/vscode-input.component';
import { SlideItemComponent } from '../slide-item/slide-item.component';
import { SlideImportModalComponent } from '../slide-import-modal/slide-import-modal.component';
import { SlideService } from '../../../core/slide.service';
import { Slide } from '../../../models/slide.models';

@Component({
    selector: 'app-slide-manager',
    standalone: true,
    imports: [CommonModule, VSCodePanelComponent, VSCodeInputComponent, SlideItemComponent, SlideImportModalComponent],
    template: `
    <div class="h-full flex flex-col" id="slide-col" (dragover)="handleDragOver($event)">
      <app-slide-import-modal 
        [isOpen]="isImportModalOpen" 
        (onClose)="isImportModalOpen = false"
        (onSlidesImported)="handleSlidesImported($event)">
      </app-slide-import-modal>

      <app-vscode-panel title="Slides" className="pl-3 pt-3 pb-3 h-full flex flex-col">
        <!-- Screen Controls -->
        <div class="flex items-center justify-between mb-3 pr-3">
          <div class="flex items-center gap-2">
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
          </div>
        </div>

        <!-- Thumbnail Size Control -->
        <div class="flex items-center gap-4 mb-3 pr-3">
          <label for="thumbnail-size-slider" class="text-sm text-gray-500">Slide Size</label>
          <app-vscode-input
            aria-label="Slide Size"
            type="range"
            id="thumbnail-size-slider"
            min="80"
            max="520"
            [value]="thumbnailSize.toString()"
            (onChange)="setThumbnailSize($event)"
            className="w-48"
          ></app-vscode-input>
          <div class="text-sm text-gray-500">{{ thumbnailSize }}px</div>
          <button
            aria-label="Reset slide size"
            title="Reset"
            class="vscode-button vscode-button-icon secondary ml-auto"
            (click)="resetThumbnailSize()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        <!-- Slides Grid -->
        <div
          class="slides-wrap flex-1 overflow-y-auto"
          #slidesWrap
          [style.--slide-size]="thumbnailSize + 'px'"
        >
          <div class="slides-wrap-item" *ngFor="let slide of slideService.slides(); let i = index" [attr.data-slide-index]="i">
            <app-slide-item
              [slide]="slide"
              [index]="i"
              [isSelected]="i === slideService.currentSlideIndex()"
              (onSelect)="handleSlideClick(i)"
              (onDragStart)="handleDragStart($event, i)"
              (onDragEnter)="handleDragEnter($event, i)"
              (onDrop)="handleDrop($event, i)"
              (onDragEnd)="handleDragEnd()"
              [thumbnailSize]="thumbnailSize"
            ></app-slide-item>
          </div>
        </div>
      </app-vscode-panel>
    </div>
  `,
    styles: [`
    .slides-wrap {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--slide-size), 1fr));
      gap: 12px;
      padding: 12px;
      align-content: start;
    }
    .slides-wrap-item {
      aspect-ratio: 16 / 9;
    }
  `]
})
export class SlideManagerComponent {
    slideService = inject(SlideService);

    thumbnailSize = 220;
    isImportModalOpen = false;

    @ViewChild('slidesWrap') slidesWrapRef!: ElementRef;

    private dragItem: number | null = null;
    private dragOverItem: number | null = null;

    @HostListener('document:keydown', ['$event'])
    handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.slideService.nextSlide();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            this.slideService.previousSlide();
        } else if (e.key === 'Delete') {
            e.preventDefault();
            const currentIdx = this.slideService.currentSlideIndex();
            const slide = this.slideService.slides()[currentIdx];
            if (slide) {
                this.slideService.deleteSlide(slide.id).subscribe();
            }
        }
    }

    setThumbnailSize(value: string) {
        this.thumbnailSize = parseInt(value, 10);
    }

    resetThumbnailSize() {
        this.thumbnailSize = 220;
    }

    openImportModal() {
        this.isImportModalOpen = true;
    }

    handleSlidesImported(newSlides: Slide[]) {
        // This should actually probably go through the service
        this.slideService.slides.update(list => [...list, ...newSlides]);
    }

    handleSlideClick(index: number) {
        this.slideService.selectSlide(index);
    }

    handleDragStart(e: DragEvent, position: number) {
        this.dragItem = position;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', position.toString());
        }
    }

    handleDragEnter(e: DragEvent, position: number) {
        e.preventDefault();
        this.dragOverItem = position;
    }

    handleDrop(e: DragEvent, position: number) {
        e.preventDefault();
        if (this.dragItem !== null && this.dragItem !== position) {
            // Reorder logic
            this.slideService.slides.update(list => {
                const newList = [...list];
                const [movedItem] = newList.splice(this.dragItem!, 1);
                newList.splice(position, 0, movedItem);
                return newList.map((s, idx) => ({ ...s, order: idx }));
            });
        }
        this.dragItem = null;
        this.dragOverItem = null;
    }

    handleDragEnd() {
        this.dragItem = null;
        this.dragOverItem = null;
    }

    handleDragOver(e: DragEvent) {
        e.preventDefault();
    }
}
