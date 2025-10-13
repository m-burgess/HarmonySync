/**
 * SlideManager Component - Center area displaying slide grid and screen buttons
 * Inspired by VS Code's editor area
 */

import { Component } from '../Component';
import { Slide } from '../../types';

export interface SlideManagerOptions {
  parent?: HTMLElement;
  onSlideSelect?: (slide: Slide) => void;
}

export class SlideManager extends Component<HTMLDivElement> {
  private slides: Slide[] = [];
  private selectedSlide: Slide | null = null;
  private options: SlideManagerOptions;

  constructor(options: SlideManagerOptions = {}) {
    super('div', {
      className: 'slide-manager',
      parent: options.parent,
    });
    this.options = options;
    this.render();
    this.setupKeyboardNavigation();
  }

  setSlides(slides: Slide[]): void {
    this.slides = slides;
    this.render();
  }

  getSlides(): Slide[] {
    return this.slides;
  }

  setSelectedSlide(slide: Slide | null): void {
    this.selectedSlide = slide;
    this.render();
  }

  render(): void {
    const html = `
      <div class="slide-manager-header">
        <div class="screen-buttons">
          <button class="screen-button" data-action="audience" title="Open Audience Screen">
            <span class="codicon codicon-screen-normal"></span>
            <span>Audience</span>
          </button>
          <button class="screen-button" data-action="confidence" title="Open Confidence Monitor">
            <span class="codicon codicon-eye"></span>
            <span>Confidence</span>
          </button>
          <button class="screen-button" data-action="lowerthirds" title="Open Lower Thirds">
            <span class="codicon codicon-text-size"></span>
            <span>Lower Thirds</span>
          </button>
        </div>
      </div>
      <div class="slide-grid">
        ${this.renderSlides()}
      </div>
    `;
    this.setHTML(html);
    this.attachEventListeners();
  }

  private renderSlides(): string {
    if (this.slides.length === 0) {
      return '<div class="empty-state">No slides loaded</div>';
    }

    return this.slides
      .map(
        (slide, index) => `
        <div class="slide-item ${this.selectedSlide?.id === slide.id ? 'selected' : ''}" 
             data-slide-id="${slide.id}" 
             data-index="${index}">
          <div class="slide-preview">
            ${this.renderSlideContent(slide)}
          </div>
          <div class="slide-number">${index + 1}</div>
        </div>
      `
      )
      .join('');
  }

  private renderSlideContent(slide: Slide): string {
    switch (slide.type) {
      case 'lyric':
        return `<div class="slide-lyric">${this.escapeHtml(slide.content)}</div>`;
      case 'image':
        return `<div class="slide-image" style="background-image: url('${slide.content}')"></div>`;
      case 'video':
        return `<div class="slide-video"><span class="codicon codicon-play-circle"></span></div>`;
      case 'blank':
        return '<div class="slide-blank"></div>';
      default:
        return `<div class="slide-content">${this.escapeHtml(slide.content)}</div>`;
    }
  }

  private attachEventListeners(): void {
    // Handle slide clicks
    const slideItems = this.element.querySelectorAll('.slide-item');
    slideItems.forEach((item) => {
      item.addEventListener('click', () => {
        const slideId = item.getAttribute('data-slide-id');
        const slide = this.slides.find((s) => s.id === slideId);
        if (slide) {
          this.selectSlide(slide);
        }
      });
    });

    // Handle screen button clicks
    const screenButtons = this.element.querySelectorAll('.screen-button');
    screenButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
        if (action) {
          this.openScreen(action);
        }
      });
    });
  }

  private setupKeyboardNavigation(): void {
    this.addEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (!this.selectedSlide || this.slides.length === 0) {
        return;
      }

      const currentIndex = this.slides.findIndex((s) => s.id === this.selectedSlide?.id);
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, this.slides.length - 1);
        this.selectSlide(this.slides[nextIndex]);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        this.selectSlide(this.slides[prevIndex]);
      }
    });
  }

  private selectSlide(slide: Slide): void {
    this.selectedSlide = slide;
    if (this.options.onSlideSelect) {
      this.options.onSlideSelect(slide);
    }
    this.render();
  }

  private async openScreen(screenType: string): Promise<void> {
    // In a real implementation, this would call Tauri to open the window
    console.log(`Opening ${screenType} screen`);
    // Example: await invoke('open_screen', { screenType });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
