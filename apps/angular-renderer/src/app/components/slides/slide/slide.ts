import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';
import { Slide } from '../../../models/slide.models';
import { DisplayService } from '../../../core/display.service';

export type SlideSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-slide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide.html',
  styleUrl: './slide.scss'
})
export class SlideComponent implements OnInit {
  @Input() slide!: Slide;
  @Input() index!: number;
  @Input() isSelected = false;
  @Input() size: SlideSize = 'medium';
  @Input() thumbnailSize?: number;
  @Input() showActions = true;
  @Input() showTypeIcon = true;
  @Input() className = '';

  @Output() onSelect = new EventEmitter<number>();
  @Output() onDragStart = new EventEmitter<{ event: DragEvent, index: number }>();
  @Output() onDragEnter = new EventEmitter<{ event: DragEvent, index: number }>();
  @Output() onDrop = new EventEmitter<{ event: DragEvent, index: number }>();
  @Output() onDragEnd = new EventEmitter<void>();
  @Output() onVideoTranscoded = new EventEmitter<{ index: number, path: string }>();

  isDragOver = false;
  isLoading = false;

  @ViewChild('slideRef') slideRef!: ElementRef;

  private electron = inject(ElectronService);
  private displayService = inject(DisplayService);

  constructor() { }

  ngOnInit() { }

  get slideClass(): string {
    return [
      'slide-component',
      this.thumbnailSize ? 'slide-custom' : `slide-${this.size}`,
      this.isSelected ? 'slide-selected' : '',
      this.isDragOver ? 'slide-drag-over' : '',
      this.isLoading ? 'slide-loading' : '',
      this.className
    ].filter(Boolean).join(' ');
  }

  get customStyle() {
    if (this.thumbnailSize) {
      return {
        'width.px': this.thumbnailSize,
        'height.px': Math.round(this.thumbnailSize * 0.56),
        '--slide-width.px': this.thumbnailSize
      };
    }
    return {};
  }

  get mainImageSrc(): string {
    if (this.slide.type === 'video' && this.slide.thumbnail_path) {
      return this.electron.convertFileSrc(this.slide.thumbnail_path);
    }
    if (this.slide.type === 'youtube' && this.slide.videoId) {
      return `https://img.youtube.com/vi/${this.slide.videoId}/0.jpg`;
    }
    return (this.slide.path ? this.electron.convertFileSrc(this.slide.path) : '');
  }

  get videoDuration(): string | null {
    if (this.slide.type === 'video' && this.slide.duration) {
      const minutes = Math.floor(this.slide.duration / 60);
      const seconds = Math.floor(this.slide.duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  }

  async handleClick(e?: Event) {
    if (e) e.stopPropagation();

    this.onSelect.emit(this.index);

    try {
      if (this.slide.type === 'image') {
        this.displayService.showSlide(this.slide).subscribe();
      } else if (this.slide.type === 'video') {
        await this.handleVideoClick();
      } else if (this.slide.type === 'youtube') {
        await this.electron.emit('navigate', { videoId: this.slide.videoId });
      }
    } catch (error) {
      console.error('Error handling slide click:', error);
    }
  }

  async handleVideoClick() {
    if (this.slide.type !== 'video' || !this.slide.path) return;

    const isAlreadyTranscoded = this.slide.path.includes('/harmonysync/cache/') && this.slide.path.endsWith('_youtube.mp4');

    if (isAlreadyTranscoded) {
      this.displayService.displayVideoSlide(this.slide.path, this.slide.duration).subscribe();
    } else {
      this.isLoading = true;
      try {
        const transcodedPath = await this.electron.invoke('video:transcode', this.slide.path);
        this.onVideoTranscoded.emit({ index: this.index, path: transcodedPath });
        this.displayService.displayVideoSlide(transcodedPath, this.slide.duration).subscribe();
      } catch (error) {
        console.error('Error transcoding video:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  handleDragStartLocal(e: DragEvent) {
    this.onDragStart.emit({ event: e, index: this.index });
  }

  handleDragEnterLocal(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = true;
    this.onDragEnter.emit({ event: e, index: this.index });
  }

  handleDragLeaveLocal() {
    this.isDragOver = false;
  }

  handleDropLocal(e: DragEvent) {
    this.isDragOver = false;
    this.onDrop.emit({ event: e, index: this.index });
  }
}
