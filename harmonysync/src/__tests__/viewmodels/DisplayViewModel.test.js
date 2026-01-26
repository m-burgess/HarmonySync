/**
 * DisplayViewModel Tests
 * 
 * These tests demonstrate how ViewModels are easy to test
 * because they're plain JavaScript classes with no React dependencies.
 */
import DisplayViewModel from '../../viewmodels/DisplayViewModel';

describe('DisplayViewModel', () => {
  let displayViewModel;
  let mockDisplayService;
  let mockFileService;
  let mockIpcService;

  beforeEach(() => {
    // Create mock services
    mockDisplayService = {
      getDisplayConfig: jest.fn(),
      saveDisplayConfig: jest.fn()
    };

    mockFileService = {
      readTextFile: jest.fn(),
      writeTextFile: jest.fn()
    };

    mockIpcService = {
      invoke: jest.fn()
    };

    // Create ViewModel with mock services
    displayViewModel = new DisplayViewModel(mockDisplayService, mockFileService, mockIpcService);
  });

  describe('initial state', () => {
    test('has empty display configs', () => {
      expect(displayViewModel.displayConfigs).toEqual([]);
    });

    test('has empty available displays', () => {
      expect(displayViewModel.availableDisplays).toEqual([]);
    });

    test('is not loading', () => {
      expect(displayViewModel.isLoading).toBe(false);
    });

    test('has default font settings', () => {
      expect(displayViewModel.audienceFontSize).toBe('72');
      expect(displayViewModel.confidenceFontSize).toBe('72');
      expect(displayViewModel.audienceFontFamily).toBe('Arial');
      expect(displayViewModel.confidenceFontFamily).toBe('Arial');
    });

    test('has no editing state', () => {
      expect(displayViewModel.editingDisplay).toBeNull();
      expect(displayViewModel.showAddForm).toBe(false);
    });
  });

  describe('computed properties', () => {
    test('hasDisplays returns false when no configs', () => {
      expect(displayViewModel.hasDisplays).toBe(false);
    });

    test('hasDisplays returns true when configs exist', () => {
      displayViewModel.displayConfigs = [
        { id: '1', name: 'Display 1', order: 1 }
      ];
      expect(displayViewModel.hasDisplays).toBe(true);
    });

    test('sortedDisplays sorts by order', () => {
      displayViewModel.displayConfigs = [
        { id: '3', name: 'Display 3', order: 3 },
        { id: '1', name: 'Display 1', order: 1 },
        { id: '2', name: 'Display 2', order: 2 }
      ];

      const sorted = displayViewModel.sortedDisplays;
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    test('audiencePreviewFontSize calculates correctly', () => {
      displayViewModel.audienceFontSize = '72';
      expect(displayViewModel.audiencePreviewFontSize).toBe(24);
    });

    test('audiencePreviewFontSize clamps to max', () => {
      displayViewModel.audienceFontSize = '200';
      expect(displayViewModel.audiencePreviewFontSize).toBe(48);
    });

    test('confidencePreviewFontSize calculates correctly', () => {
      displayViewModel.confidenceFontSize = '60';
      expect(displayViewModel.confidencePreviewFontSize).toBe(20);
    });
  });

  describe('loadDisplayConfigs', () => {
    test('loads configs successfully', async () => {
      // Arrange
      const mockConfigs = [
        { id: '1', name: 'Audience', type: 'audience', enabled: true, order: 1 },
        { id: '2', name: 'Confidence', type: 'confidence', enabled: true, order: 2 }
      ];
      mockIpcService.invoke.mockResolvedValue(mockConfigs);

      // Act
      await displayViewModel.loadDisplayConfigs();

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:getAll');
      expect(displayViewModel.displayConfigs).toEqual(mockConfigs);
      expect(displayViewModel.isLoading).toBe(false);
    });

    test('handles load error', async () => {
      // Arrange
      mockIpcService.invoke.mockRejectedValue(new Error('Failed to load'));

      // Act
      await displayViewModel.loadDisplayConfigs();

      // Assert
      expect(displayViewModel.error).toBe('Failed to load');
      expect(displayViewModel.displayConfigs).toEqual([]);
      expect(displayViewModel.isLoading).toBe(false);
    });

    test('handles null response', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue(null);

      // Act
      await displayViewModel.loadDisplayConfigs();

      // Assert
      expect(displayViewModel.displayConfigs).toEqual([]);
      expect(displayViewModel.isLoading).toBe(false);
    });
  });

  describe('loadLegacySettings', () => {
    test('loads settings from file', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue('/settings/path');
      const mockSettings = {
        audienceFontSize: '96',
        confidenceFontSize: '80',
        audienceFontFamily: 'Verdana',
        confidenceFontFamily: 'Georgia'
      };
      mockFileService.readTextFile.mockResolvedValue(JSON.stringify(mockSettings));

      // Act
      await displayViewModel.loadLegacySettings();

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('settings:getSettingsPath');
      expect(mockFileService.readTextFile).toHaveBeenCalledWith('/settings/path/display_settings.json');
      expect(displayViewModel.audienceFontSize).toBe('96');
      expect(displayViewModel.confidenceFontSize).toBe('80');
      expect(displayViewModel.audienceFontFamily).toBe('Verdana');
      expect(displayViewModel.confidenceFontFamily).toBe('Georgia');
    });

    test('uses defaults when file does not exist', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue('/settings/path');
      mockFileService.readTextFile.mockRejectedValue(new Error('File not found'));

      // Act
      await displayViewModel.loadLegacySettings();

      // Assert
      expect(displayViewModel.audienceFontSize).toBe('72');
      expect(displayViewModel.confidenceFontSize).toBe('72');
      expect(displayViewModel.audienceFontFamily).toBe('Arial');
      expect(displayViewModel.confidenceFontFamily).toBe('Arial');
    });

    test('uses defaults for missing properties', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue('/settings/path');
      const mockSettings = {
        audienceFontSize: '96'
        // Other properties missing
      };
      mockFileService.readTextFile.mockResolvedValue(JSON.stringify(mockSettings));

      // Act
      await displayViewModel.loadLegacySettings();

      // Assert
      expect(displayViewModel.audienceFontSize).toBe('96');
      expect(displayViewModel.confidenceFontSize).toBe('72'); // default
      expect(displayViewModel.audienceFontFamily).toBe('Arial'); // default
    });
  });

  describe('loadAvailableDisplays', () => {
    test('loads available displays', async () => {
      // Arrange
      const mockDisplays = [
        { id: 'display1', name: 'Primary Monitor' },
        { id: 'display2', name: 'Secondary Monitor' }
      ];
      mockIpcService.invoke.mockResolvedValue(mockDisplays);

      // Act
      await displayViewModel.loadAvailableDisplays();

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('settings:getDisplays');
      expect(displayViewModel.availableDisplays).toEqual(mockDisplays);
    });

    test('uses fallback displays on error', async () => {
      // Arrange
      mockIpcService.invoke.mockRejectedValue(new Error('Failed to get displays'));

      // Act
      await displayViewModel.loadAvailableDisplays();

      // Assert
      expect(displayViewModel.availableDisplays).toEqual([
        { id: 'primary', name: 'Primary Display' },
        { id: 'secondary', name: 'Secondary Display' }
      ]);
    });
  });

  describe('initialize', () => {
    test('loads all data in parallel', async () => {
      // Arrange
      mockIpcService.invoke.mockImplementation((command) => {
        if (command === 'displayConfig:getAll') return Promise.resolve([]);
        if (command === 'settings:getSettingsPath') return Promise.resolve('/path');
        if (command === 'settings:getDisplays') return Promise.resolve([]);
        return Promise.resolve(null);
      });
      mockFileService.readTextFile.mockRejectedValue(new Error('No file'));

      // Act
      await displayViewModel.initialize();

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:getAll');
      expect(mockIpcService.invoke).toHaveBeenCalledWith('settings:getSettingsPath');
      expect(mockIpcService.invoke).toHaveBeenCalledWith('settings:getDisplays');
    });
  });

  describe('saveSettings', () => {
    test('saves settings to file', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue('/settings/path');
      mockFileService.writeTextFile.mockResolvedValue();
      displayViewModel.audienceFontSize = '96';
      displayViewModel.confidenceFontSize = '80';

      // Act
      const result = await displayViewModel.saveSettings();

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('settings:getSettingsPath');
      expect(mockFileService.writeTextFile).toHaveBeenCalled();
      const writeCall = mockFileService.writeTextFile.mock.calls[0];
      expect(writeCall[0]).toBe('/settings/path/display_settings.json');
      const savedData = JSON.parse(writeCall[1]);
      expect(savedData.audienceFontSize).toBe('96');
      expect(savedData.confidenceFontSize).toBe('80');
      expect(result).toBe(true);
    });

    test('handles save error', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue('/settings/path');
      mockFileService.writeTextFile.mockRejectedValue(new Error('Write failed'));

      // Act
      const result = await displayViewModel.saveSettings();

      // Assert
      expect(displayViewModel.error).toBe('Write failed');
      expect(result).toBe(false);
    });
  });

  describe('display CRUD operations', () => {
    test('addDisplay creates new display config', async () => {
      // Arrange
      const newDisplay = {
        name: 'LED Wall',
        type: 'audience',
        deviceId: 'display1',
        enabled: true
      };
      mockIpcService.invoke.mockResolvedValue();

      // Act
      const result = await displayViewModel.addDisplay(newDisplay);

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:create', { config: newDisplay });
      expect(displayViewModel.showAddForm).toBe(false);
      expect(result).toBe(true);
    });

    test('addDisplay handles error', async () => {
      // Arrange
      mockIpcService.invoke.mockRejectedValue(new Error('Create failed'));

      // Act
      const result = await displayViewModel.addDisplay({});

      // Assert
      expect(displayViewModel.error).toBe('Create failed');
      expect(result).toBe(false);
    });

    test('updateDisplay updates existing display', async () => {
      // Arrange
      const updates = { name: 'Updated Name' };
      mockIpcService.invoke.mockResolvedValue();

      // Act
      const result = await displayViewModel.updateDisplay('display1', updates);

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:update', { 
        id: 'display1', 
        updates 
      });
      expect(displayViewModel.editingDisplay).toBeNull();
      expect(result).toBe(true);
    });

    test('deleteDisplay removes display', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue();

      // Act
      const result = await displayViewModel.deleteDisplay('display1');

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:delete', { 
        id: 'display1' 
      });
      expect(result).toBe(true);
    });

    test('toggleDisplayEnabled toggles enabled state', async () => {
      // Arrange
      mockIpcService.invoke.mockResolvedValue();

      // Act
      const result = await displayViewModel.toggleDisplayEnabled('display1', false);

      // Assert
      expect(mockIpcService.invoke).toHaveBeenCalledWith('displayConfig:update', { 
        id: 'display1', 
        updates: { enabled: false } 
      });
      expect(result).toBe(true);
    });
  });

  describe('UI state management', () => {
    test('openAddForm sets showAddForm to true', () => {
      // Act
      displayViewModel.openAddForm();

      // Assert
      expect(displayViewModel.showAddForm).toBe(true);
    });

    test('closeAddForm sets showAddForm to false', () => {
      // Arrange
      displayViewModel.showAddForm = true;

      // Act
      displayViewModel.closeAddForm();

      // Assert
      expect(displayViewModel.showAddForm).toBe(false);
    });

    test('startEditing sets editingDisplay', () => {
      // Arrange
      const display = { id: '1', name: 'Test' };

      // Act
      displayViewModel.startEditing(display);

      // Assert
      expect(displayViewModel.editingDisplay).toEqual(display);
    });

    test('cancelEditing clears editing state', () => {
      // Arrange
      displayViewModel.editingDisplay = { id: '1' };
      displayViewModel.showAddForm = true;

      // Act
      displayViewModel.cancelEditing();

      // Assert
      expect(displayViewModel.editingDisplay).toBeNull();
      expect(displayViewModel.showAddForm).toBe(false);
    });
  });

  describe('font settings', () => {
    test('setAudienceFontSize sets valid size', () => {
      // Act
      displayViewModel.setAudienceFontSize('96');

      // Assert
      expect(displayViewModel.audienceFontSize).toBe('96');
    });

    test('setAudienceFontSize rejects size below minimum', () => {
      // Act
      displayViewModel.setAudienceFontSize('20');

      // Assert
      expect(displayViewModel.audienceFontSize).toBe('72'); // unchanged
    });

    test('setAudienceFontSize rejects size above maximum', () => {
      // Act
      displayViewModel.setAudienceFontSize('250');

      // Assert
      expect(displayViewModel.audienceFontSize).toBe('72'); // unchanged
    });

    test('setConfidenceFontSize sets valid size', () => {
      // Act
      displayViewModel.setConfidenceFontSize('100');

      // Assert
      expect(displayViewModel.confidenceFontSize).toBe('100');
    });

    test('setAudienceFontFamily sets valid family', () => {
      // Act
      displayViewModel.setAudienceFontFamily('Verdana');

      // Assert
      expect(displayViewModel.audienceFontFamily).toBe('Verdana');
    });

    test('setAudienceFontFamily rejects invalid family', () => {
      // Act
      displayViewModel.setAudienceFontFamily('InvalidFont');

      // Assert
      expect(displayViewModel.audienceFontFamily).toBe('Arial'); // unchanged
    });

    test('setConfidenceFontFamily sets valid family', () => {
      // Act
      displayViewModel.setConfidenceFontFamily('Georgia');

      // Assert
      expect(displayViewModel.confidenceFontFamily).toBe('Georgia');
    });
  });

  describe('utility methods', () => {
    test('getDisplayNameById returns display name', () => {
      // Arrange
      displayViewModel.availableDisplays = [
        { id: 'display1', name: 'Primary Monitor' },
        { id: 'display2', name: 'Secondary Monitor' }
      ];

      // Act
      const name = displayViewModel.getDisplayNameById('display1');

      // Assert
      expect(name).toBe('Primary Monitor');
    });

    test('getDisplayNameById returns id when not found', () => {
      // Arrange
      displayViewModel.availableDisplays = [
        { id: 'display1', name: 'Primary Monitor' }
      ];

      // Act
      const name = displayViewModel.getDisplayNameById('unknown');

      // Assert
      expect(name).toBe('unknown');
    });

    test('getOutputDescription returns device description', () => {
      // Arrange
      displayViewModel.availableDisplays = [
        { id: 'display1', name: 'Primary Monitor' }
      ];
      const config = { deviceId: 'display1' };

      // Act
      const desc = displayViewModel.getOutputDescription(config);

      // Assert
      expect(desc).toBe('Device: Primary Monitor');
    });

    test('getOutputDescription returns NDI description', () => {
      // Arrange
      const config = { ndiOutput: 'HarmonySync-Out1' };

      // Act
      const desc = displayViewModel.getOutputDescription(config);

      // Assert
      expect(desc).toBe('NDI: HarmonySync-Out1');
    });

    test('getOutputDescription returns Auto when no output specified', () => {
      // Arrange
      const config = {};

      // Act
      const desc = displayViewModel.getOutputDescription(config);

      // Assert
      expect(desc).toBe('Auto');
    });
  });

  describe('dispose', () => {
    test('clears all state', () => {
      // Arrange
      displayViewModel.displayConfigs = [{ id: '1' }];
      displayViewModel.availableDisplays = [{ id: 'd1' }];
      displayViewModel.editingDisplay = { id: '1' };
      displayViewModel.showAddForm = true;

      // Act
      displayViewModel.dispose();

      // Assert
      expect(displayViewModel.displayConfigs).toEqual([]);
      expect(displayViewModel.availableDisplays).toEqual([]);
      expect(displayViewModel.editingDisplay).toBeNull();
      expect(displayViewModel.showAddForm).toBe(false);
    });
  });
});
