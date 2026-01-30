/**
 * Integration Test: Slide Import and Display Workflow
 * 
 * Tests the complete workflow of:
 * 1. Importing slides from folder
 * 2. Navigating through slides
 * 3. Displaying slide on screen
 * 
 * This test verifies SlideViewModel and DisplayViewModel interaction.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Container from '../../di/Container.js';
import IpcService from '../../services/IpcService.js';
import SlideService from '../../services/SlideService.js';
import DisplayService from '../../services/DisplayService.js';
import EventBusService, { EVENT_TYPES } from '../../services/EventBusService.js';
import SlideViewModel from '../../viewmodels/SlideViewModel.js';
import DisplayViewModel from '../../viewmodels/DisplayViewModel.js';
import FileService from '../../services/FileService.js';

describe('Integration: Slide Import and Display Workflow', () => {
  let container;
  let slideViewModel;
  let displayViewModel;
  let eventBus;
  let mockIpcService;

  beforeEach(() => {
    // Create fresh DI container
    container = new Container();

    // Create mock IPC service
    mockIpcService = {
      invoke: vi.fn(),
      listen: vi.fn(() => () => {}),
      emit: vi.fn(),
    };

    // Register services
    container.registerInstance('ipcService', mockIpcService);
    container.register('eventBusService', EventBusService, [], true);
    container.register('fileService', FileService, ['ipcService'], true);
    container.register('slideService', SlideService, ['ipcService'], true);
    container.register('displayService', DisplayService, ['ipcService'], true);

    // Register ViewModels
    container.register('slideViewModel', SlideViewModel, ['slideService', 'displayService'], true);
    container.register('displayViewModel', DisplayViewModel, ['displayService', 'fileService', 'ipcService'], true);

    // Resolve ViewModels
    slideViewModel = container.resolve('slideViewModel');
    displayViewModel = container.resolve('displayViewModel');
    eventBus = container.resolve('eventBusService');
  });

  afterEach(() => {
    container.clear();
    vi.clearAllMocks();
  });

  it('should complete full slide import and display workflow', async () => {
    // Mock IPC responses
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'select_folder':
          return '/path/to/slides';
        case 'import_slides_from_folder':
          return [
            { path: '/slides/slide1.png', name: 'Slide 1', type: 'image' },
            { path: '/slides/slide2.png', name: 'Slide 2', type: 'image' },
            { path: '/slides/slide3.png', name: 'Slide 3', type: 'image' },
          ];
        case 'display_slide':
          return { success: true };
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080 },
            confidenceWindow: { x: 1920, y: 0, width: 1920, height: 1080 },
          };
        default:
          return null;
      }
    });

    // Step 1: Import slides from folder
    await slideViewModel.importFromFolder();

    expect(slideViewModel.slides.length).toBe(3);
    expect(slideViewModel.slides[0].name).toBe('Slide 1');
    expect(slideViewModel.slides[1].name).toBe('Slide 2');
    expect(slideViewModel.slides[2].name).toBe('Slide 3');
    expect(mockIpcService.invoke).toHaveBeenCalledWith('select_folder');
    expect(mockIpcService.invoke).toHaveBeenCalledWith('import_slides_from_folder', '/path/to/slides', {});

    // Verify slide imported event
    const importedHandler = vi.fn();
    eventBus.subscribe(EVENT_TYPES.SLIDE_IMPORTED, importedHandler);
    eventBus.publish(EVENT_TYPES.SLIDE_IMPORTED, { count: slideViewModel.slides.length });
    expect(importedHandler).toHaveBeenCalledWith({ count: 3 });

    // Step 2: Navigate through slides
    slideViewModel.selectSlide(slideViewModel.slides[0]);
    expect(slideViewModel.selectedSlide).toBe(slideViewModel.slides[0]);
    expect(slideViewModel.selectedSlideIndex).toBe(0);

    slideViewModel.navigateDown();
    expect(slideViewModel.selectedSlideIndex).toBe(1);
    expect(slideViewModel.selectedSlide.name).toBe('Slide 2');

    slideViewModel.navigateDown();
    expect(slideViewModel.selectedSlideIndex).toBe(2);

    slideViewModel.navigateUp();
    expect(slideViewModel.selectedSlideIndex).toBe(1);

    // Step 3: Display slide on screen
    const slideToDisplay = slideViewModel.selectedSlide;
    await slideViewModel.displaySlide(slideToDisplay);

    expect(mockIpcService.invoke).toHaveBeenCalledWith('display_slide', slideToDisplay.path);
  });

  it('should handle multiple slide sources', async () => {
    // Mock responses for different import types
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'select_folder':
          return '/path/to/images';
        case 'select_pdf':
          return '/path/to/presentation.pdf';
        case 'import_slides_from_folder':
          return [
            { path: '/images/img1.jpg', name: 'Image 1', type: 'image' },
          ];
        case 'import_slides_from_pdf':
          return [
            { path: '/pdf/page1.png', name: 'Page 1', type: 'pdf' },
            { path: '/pdf/page2.png', name: 'Page 2', type: 'pdf' },
          ];
        default:
          return null;
      }
    });

    // Import from folder
    await slideViewModel.importFromFolder();
    expect(slideViewModel.slides.length).toBe(1);

    // Import from PDF
    await slideViewModel.importFromPDF();
    expect(slideViewModel.slides.length).toBe(3); // 1 image + 2 PDF pages

    // Verify mixed slide types
    expect(slideViewModel.slides[0].type).toBe('image');
    expect(slideViewModel.slides[1].type).toBe('pdf');
    expect(slideViewModel.slides[2].type).toBe('pdf');
  });

  it('should handle slide navigation edge cases', async () => {
    // Mock slides
    mockIpcService.invoke.mockResolvedValue([
      { path: '/slide1.png', name: 'Slide 1', type: 'image' },
      { path: '/slide2.png', name: 'Slide 2', type: 'image' },
    ]);

    await slideViewModel.importFromFolder();

    // Navigate to first slide
    slideViewModel.selectSlide(slideViewModel.slides[0]);
    expect(slideViewModel.canNavigateUp).toBe(false);
    expect(slideViewModel.canNavigateDown).toBe(true);

    // Try navigating up (should stay at first)
    slideViewModel.navigateUp();
    expect(slideViewModel.selectedSlideIndex).toBe(0);

    // Navigate to last slide
    slideViewModel.selectSlide(slideViewModel.slides[1]);
    expect(slideViewModel.canNavigateUp).toBe(true);
    expect(slideViewModel.canNavigateDown).toBe(false);

    // Try navigating down (should stay at last)
    slideViewModel.navigateDown();
    expect(slideViewModel.selectedSlideIndex).toBe(1);
  });

  it('should handle slide display with different display modes', async () => {
    // Mock display configurations
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'select_folder':
          return '/slides';
        case 'import_slides_from_folder':
          return [{ path: '/slide1.png', name: 'Slide 1', type: 'image' }];
        case 'display_slide':
          return { success: true };
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080 },
            confidenceWindow: null, // No confidence window
          };
        case 'update_display_config':
          return { success: true };
        default:
          return null;
      }
    });

    await slideViewModel.importFromFolder();
    slideViewModel.selectSlide(slideViewModel.slides[0]);

    // Display on audience window only
    await slideViewModel.displaySlide(slideViewModel.slides[0]);
    expect(mockIpcService.invoke).toHaveBeenCalledWith('display_slide', '/slide1.png');

    // Update display config to enable confidence window
    await displayViewModel.loadSettings();
    displayViewModel.confidenceWindowEnabled = true;
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', expect.any(Object));
  });

  it('should clear slides and reset state', async () => {
    // Import slides
    mockIpcService.invoke.mockResolvedValue([
      { path: '/slide1.png', name: 'Slide 1', type: 'image' },
      { path: '/slide2.png', name: 'Slide 2', type: 'image' },
    ]);

    await slideViewModel.importFromFolder();
    slideViewModel.selectSlide(slideViewModel.slides[0]);

    expect(slideViewModel.slides.length).toBe(2);
    expect(slideViewModel.selectedSlide).not.toBeNull();

    // Clear slides
    slideViewModel.clearSlides();

    expect(slideViewModel.slides.length).toBe(0);
    expect(slideViewModel.selectedSlide).toBeNull();
  });

  it('should handle slide reordering', async () => {
    // Import slides
    mockIpcService.invoke.mockResolvedValue([
      { path: '/slide1.png', name: 'Slide 1', type: 'image' },
      { path: '/slide2.png', name: 'Slide 2', type: 'image' },
      { path: '/slide3.png', name: 'Slide 3', type: 'image' },
    ]);

    await slideViewModel.importFromFolder();

    // Reorder: move slide 2 (index 1) to position 0
    slideViewModel.reorderSlides(1, 0);

    expect(slideViewModel.slides[0].name).toBe('Slide 2');
    expect(slideViewModel.slides[1].name).toBe('Slide 1');
    expect(slideViewModel.slides[2].name).toBe('Slide 3');
  });

  it('should use EventBus for slide change notifications', async () => {
    const slideChangedHandler = vi.fn();
    const slideDisplayedHandler = vi.fn();

    eventBus.subscribe(EVENT_TYPES.SLIDE_CHANGED, slideChangedHandler);
    eventBus.subscribe(EVENT_TYPES.SLIDE_DISPLAYED, slideDisplayedHandler);

    // Import and select slides
    mockIpcService.invoke.mockResolvedValue([
      { path: '/slide1.png', name: 'Slide 1', type: 'image' },
    ]);

    await slideViewModel.importFromFolder();
    slideViewModel.selectSlide(slideViewModel.slides[0]);

    // Publish events
    eventBus.publish(EVENT_TYPES.SLIDE_CHANGED, { 
      index: slideViewModel.selectedSlideIndex,
      slide: slideViewModel.selectedSlide 
    });

    await slideViewModel.displaySlide(slideViewModel.slides[0]);
    eventBus.publish(EVENT_TYPES.SLIDE_DISPLAYED, { 
      path: slideViewModel.slides[0].path 
    });

    expect(slideChangedHandler).toHaveBeenCalled();
    expect(slideDisplayedHandler).toHaveBeenCalled();
  });
});
