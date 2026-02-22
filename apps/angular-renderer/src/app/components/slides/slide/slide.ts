import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';

export type SlideSize = 'small' | 'medium' | 'large';

export interface SlideData {
  id?: string;
  name?: string;
  type?: 'image' | 'video' | 'youtube' | 'lyric';
  path?: string;
  thumbnail_path?: string;
  duration?: number;
  videoId?: string;
  text?: string[];
  section?: string;
}

@Component({
  selector: 'app-slide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide.html',
  styleUrl: './slide.scss'
})
export class SlideComponent implements OnInit, OnDestroy {
  @Input() slide!: SlideData;
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
  isHover = false;
  isLoading = false;
  showEnlargedPreview = false;
  slidePosition = { x: 0, y: 0 };

  private hoverTimeout: any;

  @ViewChild('slideRef') slideRef!: ElementRef;

  readonly LYRICS_MAX_LINES = 12;
  readonly LYRICS_FONT_SIZE_THRESHOLD = 6;

  constructor(private electron: ElectronService) { }

  ngOnInit() { }

  ngOnDestroy() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

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
        '--slide-width.px': this.thumbnailSize,
        '--lyrics-font-size': this.fontSize
      };
    }
    return {
      '--lyrics-font-size': this.fontSize
    };
  }

  get fontSize(): string {
    const lineCount = this.slide.text ? this.slide.text.length : 0;
    return lineCount > this.LYRICS_FONT_SIZE_THRESHOLD ? '0.7rem' : '0.8rem';
  }

  get displayLines(): string[] {
    return this.slide.text ? this.slide.text.slice(0, this.LYRICS_MAX_LINES) : [];
  }

  get hasMoreLines(): boolean {
    return (this.slide.text?.length || 0) > this.LYRICS_MAX_LINES;
  }

  get moreLinesCount(): number {
    return (this.slide.text?.length || 0) - this.LYRICS_MAX_LINES;
  }

  get previewImageSrc(): string | null {
    if (this.slide.type === 'image' && this.slide.path) {
      return this.electron.convertFileSrc(this.slide.path);
    } else if (this.slide.type === 'video' && this.slide.thumbnail_path) {
      return this.electron.convertFileSrc(this.slide.thumbnail_path);
    } else if (this.slide.type === 'youtube' && this.slide.videoId) {
      return `https://img.youtube.com/vi/${this.slide.videoId}/maxresdefault.jpg`;
    }
    return null;
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

    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.onSelect.emit(this.index);

    try {
      if (this.slide.type === 'image') {
        await this.electron.emit('display-image-slide', { path: this.slide.path, name: this.slide.name });
      } else if (this.slide.type === 'video') {
        await this.handleVideoClick();
      } else if (this.slide.type === 'youtube') {
        await this.electron.emit('navigate', { videoId: this.slide.videoId });
      } else { // Lyric
        await this.electron.emit('display-lyric-slide', { text: this.slide.text, section: this.slide.section });
        const sectionLabel = this.slide.section ? `[${this.slide.section}]` : '';
        const firstLine = this.slide.text?.[0] || '';
        await this.electron.emit('set-lower-thirds-text', { line1: sectionLabel, line2: firstLine });
      }
    } catch (error) {
      console.error('Error handling slide click:', error);
    }
  }

  async handleVideoClick() {
    if (this.slide.type !== 'video' || !this.slide.path) return;

    const isAlreadyTranscoded = this.slide.path.includes('/harmonysync/cache/') && this.slide.path.endsWith('_youtube.mp4');

    if (isAlreadyTranscoded) {
      await this.electron.invoke('display_video_slide', { path: this.slide.path, duration: this.slide.duration });
    } else {
      this.isLoading = true;
      try {
        const transcodedPath = await this.electron.invoke('transcode_video', { inputPath: this.slide.path });
        this.onVideoTranscoded.emit({ index: this.index, path: transcodedPath });
        await this.electron.invoke('display_video_slide', { path: transcodedPath, duration: this.slide.duration });
      } catch (error) {
        console.error('Error transcoding video:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  handleMouseEnter() {
    this.isHover = true;

    if (this.slideRef) {
      const rect = this.slideRef.nativeElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = 800;
      const popupHeight = 600;

      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      if (x + popupWidth / 2 > viewportWidth) x = viewportWidth - popupWidth / 2 - 20;
      else if (x - popupWidth / 2 < 0) x = popupWidth / 2 + 20;

      if (y + popupHeight / 2 > viewportHeight) y = viewportHeight - popupHeight / 2 - 20;
      else if (y - popupHeight / 2 < 0) y = popupHeight / 2 + 20;

      this.slidePosition = { x, y };
    }

    if (this.slide.type === 'image' || (this.slide.type === 'video' && this.slide.thumbnail_path)) {
      this.hoverTimeout = setTimeout(() => {
        this.showEnlargedPreview = true;
      }, 5000);
    }
  }

  handleMouseLeave() {
    this.isHover = false;
    this.showEnlargedPreview = false;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
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
