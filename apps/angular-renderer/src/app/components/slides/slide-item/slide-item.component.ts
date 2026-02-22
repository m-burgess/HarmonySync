import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideComponent, SlideSize } from '../slide/slide';
import { Slide } from '../../../models/slide.models';

@Component({
  selector: 'app-slide-item',
  standalone: true,
  imports: [CommonModule, SlideComponent],
  template: `
    <app-slide
      [slide]="slide"
      [index]="index"
      [isSelected]="isSelected"
      [size]="size"
      [thumbnailSize]="thumbnailSize"
      [showActions]="showActions"
      (onSelect)="onSelect.emit($event)"
      (onDragStart)="onDragStart.emit($event.event)"
      (onDragEnter)="onDragEnter.emit($event.event)"
      (onDrop)="onDrop.emit($event.event)"
      (onDragEnd)="onDragEnd.emit()"
      (onVideoTranscoded)="onVideoTranscoded.emit($event)"
    ></app-slide>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class SlideItemComponent {
  @Input() slide!: Slide;
  @Input() index!: number;
  @Input() isSelected = false;
  @Input() size: SlideSize = 'medium';
  @Input() thumbnailSize?: number;
  @Input() showActions = true;

  @Output() onSelect = new EventEmitter<number>();
  @Output() onDragStart = new EventEmitter<DragEvent>();
  @Output() onDragEnter = new EventEmitter<DragEvent>();
  @Output() onDrop = new EventEmitter<DragEvent>();
  @Output() onDragEnd = new EventEmitter<void>();
  @Output() onVideoTranscoded = new EventEmitter<{ index: number, path: string }>();
}
