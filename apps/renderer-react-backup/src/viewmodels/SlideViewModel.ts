/**
 * Slide ViewModel - Presentation logic for slide management
 * 
 * This ViewModel manages the state and business logic for slides.
 * It uses MobX for reactive state management and delegates IPC calls to SlideService.
 * 
 * Key responsibilities:
 * - Manage slide collection
 * - Handle slide import from various sources
 * - Track selected slide
 * - Handle slide display
 * - Manage thumbnail view settings
 * - Handle drag-and-drop reordering
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */

import { makeObservable, observable, action, computed, runInAction, toJS } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { ISlideViewModel } from '../types/viewmodels';
import type { Slide } from '../types';
import type { SlideData } from '../components/slides/types';
import { event } from '../electron-adapter';

// Service interfaces
interface ISlideService {
  importSlides(source: string, options?: { type?: string }): Promise<Slide[]>;
  selectFolder(): Promise<string | null>;
  selectPDF(): Promise<string | null>;
  selectZIP(): Promise<string | null>;
  importFromZIP(zipPath: string): Promise<ServiceStructure | null>;
}

interface IDisplayService {
  showSlide(slide: Slide): Promise<void>;
  displayVideoSlide(path: string, duration?: number): Promise<void>;
}

interface ServiceStructure {
  slides?: Slide[];
  songs?: unknown[];
}

export class SlideViewModel extends BaseViewModel implements ISlideViewModel {
  protected readonly viewModelName = 'SlideViewModel';

  // Observable state
  public slides: Slide[] = [];
  public currentSlideIndex: number = -1;
  public selectedSlide: Slide | null = null;
  public thumbnailSize: number = 220;
  public columns: number = 4;
  public isLoading: boolean = false;
  public error: string | null = null;
  public showImportModal: boolean = false;
  public displayId: string | null = null;

  // Services
  private slideService: ISlideService;
  private displayService: IDisplayService;

  constructor(slideService: ISlideService, displayService: IDisplayService) {
    super();
    this.slideService = slideService;
    this.displayService = displayService;

    makeObservable(this, {
      slides: observable,
      currentSlideIndex: observable,
      selectedSlide: observable,
      thumbnailSize: observable,
      columns: observable,
      isLoading: observable,
      error: observable,
      showImportModal: observable,
      displayId: observable,
      selectedSlideIndex: computed,
      hasSlides: computed,
      hasSelection: computed,
      canNavigateUp: computed,
      canNavigateDown: computed,
      currentSlide: computed,
      hasNextSlide: computed,
      hasPreviousSlide: computed,
      slideCount: computed,
      importSlides: action,
      importFromFolder: action,
      importFromPDF: action,
      importFromZIP: action,
      selectSlide: action,
      navigateUp: action,
      navigateDown: action,
      selectFirst: action,
      selectLast: action,
      deleteSlide: action,
      deleteSelected: action,
      clearSlides: action,
      reorderSlides: action,
      setThumbnailSize: action,
      increaseThumbnailSize: action,
      decreaseThumbnailSize: action,
      setColumns: action,
      openImportModal: action,
      closeImportModal: action,
      handleSlidesImported: action,
      handleVideoTranscoded: action,
      setSlides: action,
      addSlides: action,
      getSlide: action,
      loadSlides: action,
      nextSlide: action,
      previousSlide: action,
      goToSlide: action,
      displaySlide: action,
      clearDisplay: action,
      importSlide: action,
    });
  }

  // Computed properties
  public get selectedSlideIndex(): number {
    return this.slides.findIndex(slide => slide === this.selectedSlide);
  }

  public get hasSlides(): boolean {
    return this.slides.length > 0;
  }

  public get hasSelection(): boolean {
    return this.selectedSlide !== null;
  }

  public get canNavigateUp(): boolean {
    return this.selectedSlideIndex > 0;
  }

  public get canNavigateDown(): boolean {
    return this.selectedSlideIndex >= 0 && this.selectedSlideIndex < this.slides.length - 1;
  }

  public get currentSlide(): Slide | null {
    return this.currentSlideIndex >= 0 && this.currentSlideIndex < this.slides.length
      ? this.slides[this.currentSlideIndex]
      : null;
  }

  public get hasNextSlide(): boolean {
    return this.currentSlideIndex >= 0 && this.currentSlideIndex < this.slides.length - 1;
  }

  public get hasPreviousSlide(): boolean {
    return this.currentSlideIndex > 0;
  }

  public get slideCount(): number {
    return this.slides.length;
  }

  // Actions: Import slides
  public async importSlides(source: string, options: { type?: string } = {}): Promise<Slide[]> {
    this.isLoading = true;
    this.error = null;

    try {
      const importedSlides = await this.slideService.importSlides(source, options);

      runInAction(() => {
        if (importedSlides && importedSlides.length > 0) {
          this.slides.push(...importedSlides);
        }
        this.isLoading = false;
      });

      return importedSlides;
    } catch (error) {
      this.handleError('Import slides', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return [];
    }
  }

  // Actions: Import from folder
  public async importFromFolder(): Promise<Slide[] | undefined> {
    try {
      const folderPath = await this.slideService.selectFolder();
      if (!folderPath) return undefined;

      return await this.importSlides(folderPath, { type: 'folder' });
    } catch (error) {
      this.handleError('Import from folder', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
      return undefined;
    }
  }

  // Actions: Import from PDF
  public async importFromPDF(): Promise<Slide[] | undefined> {
    try {
      const pdfPath = await this.slideService.selectPDF();
      if (!pdfPath) return undefined;

      return await this.importSlides(pdfPath, { type: 'pdf' });
    } catch (error) {
      this.handleError('Import from PDF', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
      return undefined;
    }
  }

  // Actions: Import from ZIP (service file)
  public async importFromZIP(): Promise<ServiceStructure | undefined> {
    try {
      const zipPath = await this.slideService.selectZIP();
      if (!zipPath) return undefined;

      const serviceStructure = await this.slideService.importFromZIP(zipPath);

      // Handle service structure
      if (serviceStructure) {
        runInAction(() => {
          if (serviceStructure.slides && serviceStructure.slides.length > 0) {
            this.slides.push(...serviceStructure.slides);
          }
        });

        // Emit event for SetlistViewModel to handle
        // TODO: Refactor to use EventBus service instead of window events
        // This direct coupling to window violates clean architecture principles
        // and should be replaced with type-safe EventBus communication
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try {
            const customEvent = new CustomEvent('service-imported', {
              detail: serviceStructure,
            });
            window.dispatchEvent(customEvent);
          } catch (error) {
            this.logWarn('Failed to dispatch service-imported event:', error);
          }
        }

        return serviceStructure;
      }
      return undefined;
    } catch (error) {
      this.handleError('Import from ZIP', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
      });
      return undefined;
    }
  }

  private async displaySlideContent(slide: Slide): Promise<void> {
    const data = toJS(slide) as unknown as SlideData;

    switch (data.type) {
      case 'image':
        await event.emit('display-image-slide', { path: data.path, name: data.name });
        break;
      case 'video':
        await this.displayService.displayVideoSlide(data.path, data.duration);
        break;
      case 'youtube':
        await event.emit('navigate', { videoId: data.videoId });
        break;
      case 'lyric':
      default: {
        await event.emit('display-lyric-slide', { text: data.text, section: data.section });
        const sectionLabel = data.section ? `[${data.section}]` : '';
        const firstLine = data.text && data.text.length > 0 ? data.text[0] : '';
        await event.emit('set-lower-thirds-text', { line1: sectionLabel, line2: firstLine });
        break;
      }
    }
  }

  // Actions: Select slide
  public selectSlide(slide: Slide | null): void {
    if (!slide) return;

    this.selectedSlide = slide;

    // Display slide on output
    void this.displaySlideContent(slide);
  }

  // Actions: Navigate with keyboard
  public navigateUp(): void {
    if (!this.canNavigateUp) return;

    const newIndex = this.selectedSlideIndex - 1;
    this.selectSlide(this.slides[newIndex]);
  }

  public navigateDown(): void {
    if (!this.canNavigateDown) return;

    const newIndex = this.selectedSlideIndex + 1;
    this.selectSlide(this.slides[newIndex]);
  }

  public selectFirst(): void {
    if (this.hasSlides) {
      this.selectSlide(this.slides[0]);
    }
  }

  public selectLast(): void {
    if (this.hasSlides) {
      this.selectSlide(this.slides[this.slides.length - 1]);
    }
  }

  // Actions: Delete slide
  public deleteSlide(slide: Slide): void {
    const index = this.slides.indexOf(slide);
    if (index !== -1) {
      this.slides.splice(index, 1);

      // Update selection
      runInAction(() => {
        if (this.selectedSlide === slide) {
          // Select next slide or previous if at end
          if (index < this.slides.length) {
            this.selectedSlide = this.slides[index];
          } else if (this.slides.length > 0) {
            this.selectedSlide = this.slides[this.slides.length - 1];
          } else {
            this.selectedSlide = null;
          }
        }
      });
    }
  }

  // Actions: Delete selected slide
  public deleteSelected(): void {
    if (this.selectedSlide) {
      this.deleteSlide(this.selectedSlide);
    }
  }

  // Actions: Clear all slides
  public clearSlides(): void {
    runInAction(() => {
      this.slides = [];
      this.selectedSlide = null;
    });
  }

  // Actions: Reorder slides (drag and drop)
  public reorderSlides(fromIndex: number, toIndex: number): Promise<void>;
  public reorderSlides(slideIds: string[]): Promise<void>;
  public async reorderSlides(arg1: number | string[], arg2?: number): Promise<void> {
    if (Array.isArray(arg1)) {
      // Handle slideIds array
      const slideIds = arg1;
      const newOrder = slideIds
        .map(id => this.slides.find(s => s.id === id))
        .filter((s): s is Slide => s !== undefined);
      runInAction(() => {
        this.slides = newOrder;
      });
    } else {
      // Handle fromIndex, toIndex
      const fromIndex = arg1;
      const toIndex = arg2!;

      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= this.slides.length) return;
      if (toIndex < 0 || toIndex >= this.slides.length) return;

      const slide = this.slides[fromIndex];
      this.slides.splice(fromIndex, 1);
      this.slides.splice(toIndex, 0, slide);
    }
  }

  // Actions: Set thumbnail size
  public setThumbnailSize(size: number): void {
    this.thumbnailSize = Math.max(100, Math.min(400, size));
  }

  public increaseThumbnailSize(): void {
    this.setThumbnailSize(this.thumbnailSize + 20);
  }

  public decreaseThumbnailSize(): void {
    this.setThumbnailSize(this.thumbnailSize - 20);
  }

  // Actions: Set columns
  public setColumns(columns: number): void {
    this.columns = Math.max(1, Math.min(10, columns));
  }

  // Actions: Toggle import modal
  public openImportModal(): void {
    this.showImportModal = true;
  }

  public closeImportModal(): void {
    this.showImportModal = false;
  }

  // Actions: Handle imported slides from modal
  public handleSlidesImported(importedSlides: Slide[]): void {
    if (importedSlides && importedSlides.length > 0) {
      this.slides.push(...importedSlides);
    }
    this.closeImportModal();
  }

  // Actions: Handle video transcoding completion
  public handleVideoTranscoded(index: number, transcodedPath: string): void {
    if (index >= 0 && index < this.slides.length) {
      const slide = this.slides[index];
      this.slides[index] = { ...slide, path: transcodedPath } as Slide;
    }
  }

  // Actions: Replace all slides (used when loading from setlist)
  public setSlides(slides: Slide[]): void {
    runInAction(() => {
      this.slides = slides || [];
      this.selectedSlide = slides && slides.length > 0 ? slides[0] : null;
    });
  }

  // Actions: Add slides (used when importing)
  public addSlides(slides: Slide[]): void {
    if (slides && slides.length > 0) {
      this.slides.push(...slides);
    }
  }

  // Actions: Get slide by index
  public getSlide(index: number): Slide | null {
    return this.slides[index] || null;
  }

  // Utility: Format slide name for display
  public formatSlideName(slide: Slide | null): string {
    if (!slide) return '';
    return slide.title || slide.content || 'Untitled Slide';
  }

  // Interface method implementations
  public async loadSlides(folderPath: string): Promise<void> {
    await this.importSlides(folderPath, { type: 'folder' });
  }

  public async nextSlide(): Promise<void> {
    if (this.hasNextSlide) {
      this.currentSlideIndex++;
      if (this.currentSlide) {
        await this.displaySlide(this.currentSlide.id);
      }
    }
  }

  public async previousSlide(): Promise<void> {
    if (this.hasPreviousSlide) {
      this.currentSlideIndex--;
      if (this.currentSlide) {
        await this.displaySlide(this.currentSlide.id);
      }
    }
  }

  public async goToSlide(index: number): Promise<void> {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlideIndex = index;
      if (this.currentSlide) {
        await this.displaySlide(this.currentSlide.id);
      }
    }
  }

  public async displaySlide(slideId: string): Promise<void> {
    const slide = this.slides.find(s => s.id === slideId);
    if (slide) {
      await this.displaySlideContent(slide);
    }
  }

  public async clearDisplay(): Promise<void> {
    // Clear display implementation
    this.log('Clearing display...');
  }

  public async importSlide(content: string): Promise<void> {
    // Import single slide implementation
    this.log('Importing slide:', content);
  }

  // Direct state setter for App.jsx compatibility (to be phased out)
  public setSelectedSlide(slide: Slide | null): void {
    runInAction(() => {
      this.selectedSlide = slide;
    });
  }

  /**
   * Handle errors and update error state
   */
  protected override onError(_operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default SlideViewModel;
