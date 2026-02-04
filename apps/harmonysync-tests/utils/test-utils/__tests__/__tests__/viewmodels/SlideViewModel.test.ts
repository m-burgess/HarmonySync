/**
 * SlideViewModel Tests
 * 
 * These tests demonstrate how ViewModels are easy to test
 * because they're plain JavaScript classes with no React dependencies.
 */
import SlideViewModel from '../../viewmodels/SlideViewModel';

describe('SlideViewModel', () => {
  let slideViewModel;
  let mockSlideService;
  let mockDisplayService;

  beforeEach(() => {
    // Create mock slide service
    mockSlideService = {
      importSlides: jest.fn(),
      selectFolder: jest.fn(),
      selectPDF: jest.fn(),
      selectZIP: jest.fn(),
      importFromZIP: jest.fn()
    };

    // Create mock display service
    mockDisplayService = {
      showSlide: jest.fn(),
      showSlideOnAudience: jest.fn(),
      showSlideOnConfidence: jest.fn()
    };

    // Create ViewModel with mock services
    slideViewModel = new SlideViewModel(mockSlideService, mockDisplayService);
  });

  describe('initial state', () => {
    test('has empty slide list', () => {
      expect(slideViewModel.slides).toEqual([]);
    });

    test('has no selected slide', () => {
      expect(slideViewModel.selectedSlide).toBeNull();
    });

    test('has default thumbnail size', () => {
      expect(slideViewModel.thumbnailSize).toBe(220);
    });

    test('has default columns', () => {
      expect(slideViewModel.columns).toBe(4);
    });

    test('is not loading', () => {
      expect(slideViewModel.isLoading).toBe(false);
    });

    test('has no error', () => {
      expect(slideViewModel.error).toBeNull();
    });
  });

  describe('computed properties', () => {
    beforeEach(() => {
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' },
        { id: 3, name: 'Slide 3' }
      ];
    });

    test('hasSlides returns true when slides exist', () => {
      expect(slideViewModel.hasSlides).toBe(true);
    });

    test('hasSlides returns false when no slides', () => {
      slideViewModel.slides = [];
      expect(slideViewModel.hasSlides).toBe(false);
    });

    test('hasSelection returns false when no selection', () => {
      expect(slideViewModel.hasSelection).toBe(false);
    });

    test('hasSelection returns true when slide selected', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[0];
      expect(slideViewModel.hasSelection).toBe(true);
    });

    test('selectedSlideIndex returns -1 when no selection', () => {
      expect(slideViewModel.selectedSlideIndex).toBe(-1);
    });

    test('selectedSlideIndex returns correct index when selected', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[1];
      expect(slideViewModel.selectedSlideIndex).toBe(1);
    });

    test('canNavigateUp returns false when no selection', () => {
      expect(slideViewModel.canNavigateUp).toBe(false);
    });

    test('canNavigateUp returns false when at first slide', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[0];
      expect(slideViewModel.canNavigateUp).toBe(false);
    });

    test('canNavigateUp returns true when not at first slide', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[1];
      expect(slideViewModel.canNavigateUp).toBe(true);
    });

    test('canNavigateDown returns false when no selection', () => {
      expect(slideViewModel.canNavigateDown).toBe(false);
    });

    test('canNavigateDown returns false when at last slide', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[2];
      expect(slideViewModel.canNavigateDown).toBe(false);
    });

    test('canNavigateDown returns true when not at last slide', () => {
      slideViewModel.selectedSlide = slideViewModel.slides[1];
      expect(slideViewModel.canNavigateDown).toBe(true);
    });
  });

  describe('importSlides', () => {
    test('imports slides successfully', async () => {
      // Arrange
      const mockSlides = [
        { id: 1, name: 'Slide 1', path: '/path/1.jpg' },
        { id: 2, name: 'Slide 2', path: '/path/2.jpg' }
      ];
      mockSlideService.importSlides.mockResolvedValue(mockSlides);

      // Act
      const result = await slideViewModel.importSlides('/path/to/slides');

      // Assert
      expect(mockSlideService.importSlides).toHaveBeenCalledWith('/path/to/slides', {});
      expect(slideViewModel.slides).toHaveLength(2);
      expect(slideViewModel.slides[0].name).toBe('Slide 1');
      expect(slideViewModel.isLoading).toBe(false);
      expect(result).toEqual(mockSlides);
    });

    test('handles import error', async () => {
      // Arrange
      mockSlideService.importSlides.mockRejectedValue(new Error('Import failed'));

      // Act
      const result = await slideViewModel.importSlides('/path/to/slides');

      // Assert
      expect(slideViewModel.error).toBe('Import failed');
      expect(slideViewModel.isLoading).toBe(false);
      expect(result).toEqual([]);
    });

    test('handles empty import result', async () => {
      // Arrange
      mockSlideService.importSlides.mockResolvedValue([]);

      // Act
      await slideViewModel.importSlides('/path/to/slides');

      // Assert
      expect(slideViewModel.slides).toEqual([]);
      expect(slideViewModel.isLoading).toBe(false);
    });
  });

  describe('importFromFolder', () => {
    test('imports slides from selected folder', async () => {
      // Arrange
      const mockSlides = [{ id: 1, name: 'Slide 1' }];
      mockSlideService.selectFolder.mockResolvedValue('/selected/folder');
      mockSlideService.importSlides.mockResolvedValue(mockSlides);

      // Act
      await slideViewModel.importFromFolder();

      // Assert
      expect(mockSlideService.selectFolder).toHaveBeenCalled();
      expect(mockSlideService.importSlides).toHaveBeenCalledWith('/selected/folder', { type: 'folder' });
      expect(slideViewModel.slides).toHaveLength(1);
    });

    test('does nothing when folder selection cancelled', async () => {
      // Arrange
      mockSlideService.selectFolder.mockResolvedValue(null);

      // Act
      await slideViewModel.importFromFolder();

      // Assert
      expect(mockSlideService.importSlides).not.toHaveBeenCalled();
    });
  });

  describe('importFromPDF', () => {
    test('imports slides from selected PDF', async () => {
      // Arrange
      const mockSlides = [{ id: 1, name: 'Page 1' }];
      mockSlideService.selectPDF.mockResolvedValue('/selected/file.pdf');
      mockSlideService.importSlides.mockResolvedValue(mockSlides);

      // Act
      await slideViewModel.importFromPDF();

      // Assert
      expect(mockSlideService.selectPDF).toHaveBeenCalled();
      expect(mockSlideService.importSlides).toHaveBeenCalledWith('/selected/file.pdf', { type: 'pdf' });
      expect(slideViewModel.slides).toHaveLength(1);
    });

    test('does nothing when PDF selection cancelled', async () => {
      // Arrange
      mockSlideService.selectPDF.mockResolvedValue(null);

      // Act
      await slideViewModel.importFromPDF();

      // Assert
      expect(mockSlideService.importSlides).not.toHaveBeenCalled();
    });
  });

  describe('importFromZIP', () => {
    test('imports service structure from ZIP', async () => {
      // Arrange
      const mockStructure = {
        slides: [{ id: 1, name: 'Slide 1' }],
        setlist: { name: 'Service', songs: [] }
      };
      mockSlideService.selectZIP.mockResolvedValue('/selected/service.zip');
      mockSlideService.importFromZIP.mockResolvedValue(mockStructure);

      // Mock window event dispatcher
      const mockDispatchEvent = jest.fn();
      global.window = { dispatchEvent: mockDispatchEvent };

      // Act
      await slideViewModel.importFromZIP();

      // Assert
      expect(mockSlideService.selectZIP).toHaveBeenCalled();
      expect(mockSlideService.importFromZIP).toHaveBeenCalledWith('/selected/service.zip');
      expect(slideViewModel.slides).toHaveLength(1);
      expect(mockDispatchEvent).toHaveBeenCalled();
      expect(mockDispatchEvent.mock.calls[0][0].type).toBe('service-imported');
      expect(mockDispatchEvent.mock.calls[0][0].detail).toEqual(mockStructure);

      // Cleanup
      delete global.window;
    });

    test('does nothing when ZIP selection cancelled', async () => {
      // Arrange
      mockSlideService.selectZIP.mockResolvedValue(null);

      // Act
      await slideViewModel.importFromZIP();

      // Assert
      expect(mockSlideService.importFromZIP).not.toHaveBeenCalled();
    });
  });

  describe('selectSlide', () => {
    beforeEach(() => {
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' }
      ];
    });

    test('selects slide and displays it', () => {
      // Act
      slideViewModel.selectSlide(slideViewModel.slides[0]);

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[0]);
      expect(mockDisplayService.showSlide).toHaveBeenCalledWith(slideViewModel.slides[0]);
    });

    test('does nothing when slide is null', () => {
      // Act
      slideViewModel.selectSlide(null);

      // Assert
      expect(slideViewModel.selectedSlide).toBeNull();
      expect(mockDisplayService.showSlide).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' },
        { id: 3, name: 'Slide 3' }
      ];
      slideViewModel.selectedSlide = slideViewModel.slides[1];
    });

    test('navigateUp moves to previous slide', () => {
      // Act
      slideViewModel.navigateUp();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[0]);
      expect(mockDisplayService.showSlide).toHaveBeenCalledWith(slideViewModel.slides[0]);
    });

    test('navigateUp does nothing at first slide', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[0];

      // Act
      slideViewModel.navigateUp();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[0]);
    });

    test('navigateDown moves to next slide', () => {
      // Act
      slideViewModel.navigateDown();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[2]);
      expect(mockDisplayService.showSlide).toHaveBeenCalledWith(slideViewModel.slides[2]);
    });

    test('navigateDown does nothing at last slide', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[2];

      // Act
      slideViewModel.navigateDown();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[2]);
    });

    test('selectFirst selects first slide', () => {
      // Act
      slideViewModel.selectFirst();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[0]);
      expect(mockDisplayService.showSlide).toHaveBeenCalledWith(slideViewModel.slides[0]);
    });

    test('selectLast selects last slide', () => {
      // Act
      slideViewModel.selectLast();

      // Assert
      expect(slideViewModel.selectedSlide).toEqual(slideViewModel.slides[2]);
      expect(mockDisplayService.showSlide).toHaveBeenCalledWith(slideViewModel.slides[2]);
    });
  });

  describe('deleteSlide', () => {
    beforeEach(() => {
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' },
        { id: 3, name: 'Slide 3' }
      ];
    });

    test('deletes slide and selects next', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[1];

      // Act
      slideViewModel.deleteSlide(slideViewModel.slides[1]);

      // Assert
      expect(slideViewModel.slides).toHaveLength(2);
      expect(slideViewModel.slides[0].id).toBe(1);
      expect(slideViewModel.slides[1].id).toBe(3);
      expect(slideViewModel.selectedSlide.id).toBe(3);
    });

    test('deletes last slide and selects previous', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[2];

      // Act
      slideViewModel.deleteSlide(slideViewModel.slides[2]);

      // Assert
      expect(slideViewModel.slides).toHaveLength(2);
      expect(slideViewModel.selectedSlide.id).toBe(2);
    });

    test('clears selection when deleting last remaining slide', () => {
      // Arrange
      slideViewModel.slides = [{ id: 1, name: 'Slide 1' }];
      slideViewModel.selectedSlide = slideViewModel.slides[0];

      // Act
      slideViewModel.deleteSlide(slideViewModel.slides[0]);

      // Assert
      expect(slideViewModel.slides).toHaveLength(0);
      expect(slideViewModel.selectedSlide).toBeNull();
    });

    test('does not change selection when deleting unselected slide', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[0];

      // Act
      slideViewModel.deleteSlide(slideViewModel.slides[2]);

      // Assert
      expect(slideViewModel.slides).toHaveLength(2);
      expect(slideViewModel.selectedSlide.id).toBe(1);
    });

    test('deleteSelected deletes currently selected slide', () => {
      // Arrange
      slideViewModel.selectedSlide = slideViewModel.slides[1];

      // Act
      slideViewModel.deleteSelected();

      // Assert
      expect(slideViewModel.slides).toHaveLength(2);
      expect(slideViewModel.slides.find(s => s.id === 2)).toBeUndefined();
    });

    test('deleteSelected does nothing when no selection', () => {
      // Arrange
      slideViewModel.selectedSlide = null;

      // Act
      slideViewModel.deleteSelected();

      // Assert
      expect(slideViewModel.slides).toHaveLength(3);
    });
  });

  describe('clearSlides', () => {
    test('clears all slides and selection', () => {
      // Arrange
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' }
      ];
      slideViewModel.selectedSlide = slideViewModel.slides[0];

      // Act
      slideViewModel.clearSlides();

      // Assert
      expect(slideViewModel.slides).toEqual([]);
      expect(slideViewModel.selectedSlide).toBeNull();
    });
  });

  describe('reorderSlides', () => {
    beforeEach(() => {
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' },
        { id: 3, name: 'Slide 3' }
      ];
    });

    test('reorders slides correctly', () => {
      // Act - move slide from index 0 to index 2
      slideViewModel.reorderSlides(0, 2);

      // Assert
      expect(slideViewModel.slides[0].id).toBe(2);
      expect(slideViewModel.slides[1].id).toBe(3);
      expect(slideViewModel.slides[2].id).toBe(1);
    });

    test('does nothing when fromIndex equals toIndex', () => {
      // Act
      slideViewModel.reorderSlides(1, 1);

      // Assert
      expect(slideViewModel.slides[0].id).toBe(1);
      expect(slideViewModel.slides[1].id).toBe(2);
      expect(slideViewModel.slides[2].id).toBe(3);
    });

    test('does nothing when fromIndex is out of bounds', () => {
      // Act
      slideViewModel.reorderSlides(-1, 1);

      // Assert
      expect(slideViewModel.slides).toHaveLength(3);
    });

    test('does nothing when toIndex is out of bounds', () => {
      // Act
      slideViewModel.reorderSlides(0, 5);

      // Assert
      expect(slideViewModel.slides).toHaveLength(3);
    });
  });

  describe('thumbnail settings', () => {
    test('setThumbnailSize sets size within bounds', () => {
      // Act
      slideViewModel.setThumbnailSize(300);

      // Assert
      expect(slideViewModel.thumbnailSize).toBe(300);
    });

    test('setThumbnailSize clamps to minimum', () => {
      // Act
      slideViewModel.setThumbnailSize(50);

      // Assert
      expect(slideViewModel.thumbnailSize).toBe(100);
    });

    test('setThumbnailSize clamps to maximum', () => {
      // Act
      slideViewModel.setThumbnailSize(500);

      // Assert
      expect(slideViewModel.thumbnailSize).toBe(400);
    });

    test('increaseThumbnailSize increases by 20', () => {
      // Arrange
      slideViewModel.thumbnailSize = 200;

      // Act
      slideViewModel.increaseThumbnailSize();

      // Assert
      expect(slideViewModel.thumbnailSize).toBe(220);
    });

    test('decreaseThumbnailSize decreases by 20', () => {
      // Arrange
      slideViewModel.thumbnailSize = 200;

      // Act
      slideViewModel.decreaseThumbnailSize();

      // Assert
      expect(slideViewModel.thumbnailSize).toBe(180);
    });
  });

  describe('columns', () => {
    test('setColumns sets columns within bounds', () => {
      // Act
      slideViewModel.setColumns(5);

      // Assert
      expect(slideViewModel.columns).toBe(5);
    });

    test('setColumns clamps to minimum', () => {
      // Act
      slideViewModel.setColumns(0);

      // Assert
      expect(slideViewModel.columns).toBe(1);
    });

    test('setColumns clamps to maximum', () => {
      // Act
      slideViewModel.setColumns(15);

      // Assert
      expect(slideViewModel.columns).toBe(10);
    });
  });

  describe('import modal', () => {
    test('openImportModal sets showImportModal to true', () => {
      // Act
      slideViewModel.openImportModal();

      // Assert
      expect(slideViewModel.showImportModal).toBe(true);
    });

    test('closeImportModal sets showImportModal to false', () => {
      // Arrange
      slideViewModel.showImportModal = true;

      // Act
      slideViewModel.closeImportModal();

      // Assert
      expect(slideViewModel.showImportModal).toBe(false);
    });

    test('handleSlidesImported adds slides and closes modal', () => {
      // Arrange
      const importedSlides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' }
      ];
      slideViewModel.showImportModal = true;

      // Act
      slideViewModel.handleSlidesImported(importedSlides);

      // Assert
      expect(slideViewModel.slides).toEqual(importedSlides);
      expect(slideViewModel.showImportModal).toBe(false);
    });
  });

  describe('setSlides and addSlides', () => {
    test('setSlides replaces all slides and selects first', () => {
      // Arrange
      const newSlides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' }
      ];

      // Act
      slideViewModel.setSlides(newSlides);

      // Assert
      expect(slideViewModel.slides).toEqual(newSlides);
      expect(slideViewModel.selectedSlide).toEqual(newSlides[0]);
    });

    test('setSlides handles null', () => {
      // Act
      slideViewModel.setSlides(null);

      // Assert
      expect(slideViewModel.slides).toEqual([]);
      expect(slideViewModel.selectedSlide).toBeNull();
    });

    test('addSlides appends slides', () => {
      // Arrange
      slideViewModel.slides = [{ id: 1, name: 'Slide 1' }];
      const newSlides = [
        { id: 2, name: 'Slide 2' },
        { id: 3, name: 'Slide 3' }
      ];

      // Act
      slideViewModel.addSlides(newSlides);

      // Assert
      expect(slideViewModel.slides).toHaveLength(3);
      expect(slideViewModel.slides[2].id).toBe(3);
    });
  });

  describe('utility methods', () => {
    test('getSlide returns slide at index', () => {
      // Arrange
      slideViewModel.slides = [
        { id: 1, name: 'Slide 1' },
        { id: 2, name: 'Slide 2' }
      ];

      // Act
      const slide = slideViewModel.getSlide(1);

      // Assert
      expect(slide).toEqual({ id: 2, name: 'Slide 2' });
    });

    test('getSlide returns null for invalid index', () => {
      // Act
      const slide = slideViewModel.getSlide(5);

      // Assert
      expect(slide).toBeNull();
    });

    test('formatSlideName formats slide name', () => {
      // Arrange
      const slide = { name: 'My Slide' };

      // Act
      const name = slideViewModel.formatSlideName(slide);

      // Assert
      expect(name).toBe('My Slide');
    });

    test('formatSlideName uses text if no name', () => {
      // Arrange
      const slide = { text: 'Slide Text' };

      // Act
      const name = slideViewModel.formatSlideName(slide);

      // Assert
      expect(name).toBe('Slide Text');
    });

    test('formatSlideName returns default for empty slide', () => {
      // Act
      const name = slideViewModel.formatSlideName({});

      // Assert
      expect(name).toBe('Untitled Slide');
    });

    test('formatSlideName handles null', () => {
      // Act
      const name = slideViewModel.formatSlideName(null);

      // Assert
      expect(name).toBe('');
    });
  });

  describe('handleVideoTranscoded', () => {
    test('updates slide path when transcoding completes', () => {
      // Arrange
      slideViewModel.slides = [
        { id: 1, path: '/original/video.mp4' },
        { id: 2, path: '/original/video2.mp4' }
      ];

      // Act
      slideViewModel.handleVideoTranscoded(0, '/transcoded/video.webm');

      // Assert
      expect(slideViewModel.slides[0].path).toBe('/transcoded/video.webm');
      expect(slideViewModel.slides[1].path).toBe('/original/video2.mp4');
    });

    test('does nothing for invalid index', () => {
      // Arrange
      slideViewModel.slides = [{ id: 1, path: '/original/video.mp4' }];

      // Act
      slideViewModel.handleVideoTranscoded(5, '/transcoded/video.webm');

      // Assert
      expect(slideViewModel.slides[0].path).toBe('/original/video.mp4');
    });
  });

  describe('dispose', () => {
    test('clears all state', () => {
      // Arrange
      slideViewModel.slides = [{ id: 1, name: 'Slide 1' }];
      slideViewModel.selectedSlide = slideViewModel.slides[0];

      // Act
      slideViewModel.dispose();

      // Assert
      expect(slideViewModel.slides).toEqual([]);
      expect(slideViewModel.selectedSlide).toBeNull();
    });
  });
});
