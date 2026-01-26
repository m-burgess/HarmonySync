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
import { makeAutoObservable, runInAction } from 'mobx';

class SlideViewModel {
  // Observable state
  slides = [];
  selectedSlide = null;
  thumbnailSize = 220;
  columns = 4;
  isLoading = false;
  error = null;
  showImportModal = false;

  constructor(slideService, displayService) {
    this.slideService = slideService;
    this.displayService = displayService;
    makeAutoObservable(this);
  }

  // Computed properties
  get selectedSlideIndex() {
    return this.slides.findIndex(slide => slide === this.selectedSlide);
  }

  get hasSlides() {
    return this.slides.length > 0;
  }

  get hasSelection() {
    return this.selectedSlide !== null;
  }

  get canNavigateUp() {
    return this.selectedSlideIndex > 0;
  }

  get canNavigateDown() {
    return this.selectedSlideIndex >= 0 && this.selectedSlideIndex < this.slides.length - 1;
  }

  // Actions: Import slides
  async importSlides(source, options = {}) {
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
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      console.error('Error importing slides:', error);
      return [];
    }
  }

  // Actions: Import from folder
  async importFromFolder() {
    try {
      const folderPath = await this.slideService.selectFolder();
      if (!folderPath) return;

      return await this.importSlides(folderPath, { type: 'folder' });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Error importing from folder:', error);
    }
  }

  // Actions: Import from PDF
  async importFromPDF() {
    try {
      const pdfPath = await this.slideService.selectPDF();
      if (!pdfPath) return;

      return await this.importSlides(pdfPath, { type: 'pdf' });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Error importing from PDF:', error);
    }
  }

  // Actions: Import from ZIP (service file)
  async importFromZIP() {
    try {
      const zipPath = await this.slideService.selectZIP();
      if (!zipPath) return;

      const serviceStructure = await this.slideService.importFromZIP(zipPath);

      // Handle service structure
      if (serviceStructure) {
        runInAction(() => {
          if (serviceStructure.slides && serviceStructure.slides.length > 0) {
            this.slides.push(...serviceStructure.slides);
          }
        });

        // Emit event for SetlistViewModel to handle
        // Note: This coupling to window will be refactored in the future to use
        // an EventEmitter service or reactive streams (RxJS) for ViewModel-to-ViewModel communication
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try {
            const customEvent = new CustomEvent('service-imported', { 
              detail: serviceStructure 
            });
            window.dispatchEvent(customEvent);
          } catch (error) {
            console.warn('Failed to dispatch service-imported event:', error);
          }
        }

        return serviceStructure;
      }
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Error importing from ZIP:', error);
    }
  }

  // Actions: Select slide
  selectSlide(slide) {
    if (!slide) return;

    this.selectedSlide = slide;

    // Display slide on output
    this.displayService.showSlide(slide);
  }

  // Actions: Navigate with keyboard
  navigateUp() {
    if (!this.canNavigateUp) return;

    const newIndex = this.selectedSlideIndex - 1;
    this.selectSlide(this.slides[newIndex]);
  }

  navigateDown() {
    if (!this.canNavigateDown) return;

    const newIndex = this.selectedSlideIndex + 1;
    this.selectSlide(this.slides[newIndex]);
  }

  selectFirst() {
    if (this.hasSlides) {
      this.selectSlide(this.slides[0]);
    }
  }

  selectLast() {
    if (this.hasSlides) {
      this.selectSlide(this.slides[this.slides.length - 1]);
    }
  }

  // Actions: Delete slide
  deleteSlide(slide) {
    const index = this.slides.indexOf(slide);
    if (index !== -1) {
      this.slides.splice(index, 1);

      // Update selection
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
    }
  }

  // Actions: Delete selected slide
  deleteSelected() {
    if (this.selectedSlide) {
      this.deleteSlide(this.selectedSlide);
    }
  }

  // Actions: Clear all slides
  clearSlides() {
    this.slides = [];
    this.selectedSlide = null;
  }

  // Actions: Reorder slides (drag and drop)
  reorderSlides(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this.slides.length) return;
    if (toIndex < 0 || toIndex >= this.slides.length) return;

    const slide = this.slides[fromIndex];
    this.slides.splice(fromIndex, 1);
    this.slides.splice(toIndex, 0, slide);
  }

  // Actions: Set thumbnail size
  setThumbnailSize(size) {
    this.thumbnailSize = Math.max(100, Math.min(400, size));
  }

  increaseThumbnailSize() {
    this.setThumbnailSize(this.thumbnailSize + 20);
  }

  decreaseThumbnailSize() {
    this.setThumbnailSize(this.thumbnailSize - 20);
  }

  // Actions: Set columns
  setColumns(columns) {
    this.columns = Math.max(1, Math.min(10, columns));
  }

  // Actions: Toggle import modal
  openImportModal() {
    this.showImportModal = true;
  }

  closeImportModal() {
    this.showImportModal = false;
  }

  // Actions: Handle imported slides from modal
  handleSlidesImported(importedSlides) {
    if (importedSlides && importedSlides.length > 0) {
      this.slides.push(...importedSlides);
    }
    this.closeImportModal();
  }

  // Actions: Handle video transcoding completion
  handleVideoTranscoded(index, transcodedPath) {
    if (index >= 0 && index < this.slides.length) {
      const slide = this.slides[index];
      this.slides[index] = { ...slide, path: transcodedPath };
    }
  }

  // Actions: Replace all slides (used when loading from setlist)
  setSlides(slides) {
    this.slides = slides || [];
    this.selectedSlide = slides && slides.length > 0 ? slides[0] : null;
  }

  // Actions: Add slides (used when importing)
  addSlides(slides) {
    if (slides && slides.length > 0) {
      this.slides.push(...slides);
    }
  }

  // Actions: Get slide by index
  getSlide(index) {
    return this.slides[index] || null;
  }

  // Utility: Format slide name for display
  formatSlideName(slide) {
    if (!slide) return '';
    return slide.name || slide.text || 'Untitled Slide';
  }

  // Cleanup
  dispose() {
    this.slides = [];
    this.selectedSlide = null;
  }

  // Direct state setter for App.jsx compatibility (to be phased out)
  setSelectedSlide(slide) {
    this.selectedSlide = slide;
  }
}

export default SlideViewModel;
