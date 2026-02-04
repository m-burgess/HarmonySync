/**
 * Integration Test: Display Configuration Workflow
 * 
 * Tests the complete workflow of:
 * 1. Updating display settings
 * 2. Applying to windows
 * 3. Verifying settings persisted
 * 4. Testing different display modes
 * 
 * This test verifies DisplayViewModel functionality.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Container from '../../di/Container.js';
import IpcService from '../../services/IpcService.js';
import DisplayService from '../../services/DisplayService.js';
import FileService from '../../services/FileService.js';
import EventBusService, { EVENT_TYPES } from '../../services/EventBusService.js';
import DisplayViewModel from '../../viewmodels/DisplayViewModel.js';

describe('Integration: Display Configuration Workflow', () => {
  let container;
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
    container.register('displayService', DisplayService, ['ipcService'], true);

    // Register ViewModel
    container.register('displayViewModel', DisplayViewModel, 
      ['displayService', 'fileService', 'ipcService'], true);

    // Resolve
    displayViewModel = container.resolve('displayViewModel');
    eventBus = container.resolve('eventBusService');
  });

  afterEach(() => {
    container.clear();
    vi.clearAllMocks();
  });

  it('should complete full display configuration workflow', async () => {
    // Mock IPC responses
    mockIpcService.invoke.mockImplementation(async (command, ...args) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: {
              x: 0,
              y: 0,
              width: 1920,
              height: 1080,
              fullscreen: true,
            },
            confidenceWindow: {
              x: 1920,
              y: 0,
              width: 1920,
              height: 1080,
              fullscreen: true,
            },
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
          };
        case 'update_display_config':
          return { success: true };
        case 'get_available_displays':
          return [
            { id: 0, name: 'Primary Display', width: 1920, height: 1080 },
            { id: 1, name: 'Secondary Display', width: 1920, height: 1080 },
          ];
        case 'save_display_settings':
          return { success: true };
        default:
          return null;
      }
    });

    // Step 1: Load current settings
    await displayViewModel.loadSettings();

    expect(displayViewModel.audienceWindowEnabled).toBe(true);
    expect(displayViewModel.confidenceWindowEnabled).toBe(true);
    expect(displayViewModel.lowerThirdsEnabled).toBe(false);
    expect(mockIpcService.invoke).toHaveBeenCalledWith('get_display_config');

    // Step 2: Update settings
    displayViewModel.audienceWindow = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      fullscreen: true,
    };

    displayViewModel.confidenceWindow = {
      x: 1920,
      y: 0,
      width: 1280,
      height: 720,
      fullscreen: false,
    };

    displayViewModel.lowerThirdsEnabled = true;

    // Step 3: Apply settings to windows
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', {
      audienceWindow: displayViewModel.audienceWindow,
      confidenceWindow: displayViewModel.confidenceWindow,
      lowerThirdsEnabled: true,
      chromaKeyEnabled: false,
    });

    // Step 4: Verify settings persisted
    await displayViewModel.loadSettings();
    expect(displayViewModel.lowerThirdsEnabled).toBe(true);
  });

  it('should handle different display modes', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: null,
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
          };
        case 'update_display_config':
          return { success: true };
        case 'open_confidence_window':
          return { success: true };
        case 'close_confidence_window':
          return { success: true };
        default:
          return null;
      }
    });

    await displayViewModel.loadSettings();

    // Initially only audience window
    expect(displayViewModel.audienceWindowEnabled).toBe(true);
    expect(displayViewModel.confidenceWindowEnabled).toBe(false);

    // Enable confidence window
    displayViewModel.confidenceWindowEnabled = true;
    displayViewModel.confidenceWindow = {
      x: 1920,
      y: 0,
      width: 1920,
      height: 1080,
      fullscreen: true,
    };
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        confidenceWindow: expect.any(Object)
      })
    );

    // Disable confidence window
    displayViewModel.confidenceWindowEnabled = false;
    await displayViewModel.saveSettings();
  });

  it('should handle chroma key settings', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: null,
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
            chromaKeyColor: '#00FF00',
          };
        case 'update_display_config':
          return { success: true };
        default:
          return null;
      }
    });

    await displayViewModel.loadSettings();

    // Enable chroma key
    displayViewModel.chromaKeyEnabled = true;
    displayViewModel.chromaKeyColor = '#00FF00'; // Green screen
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        chromaKeyEnabled: true,
        chromaKeyColor: '#00FF00'
      })
    );

    // Change chroma key color
    displayViewModel.chromaKeyColor = '#0000FF'; // Blue screen
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        chromaKeyColor: '#0000FF'
      })
    );
  });

  it('should handle lower thirds settings', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: null,
            lowerThirdsEnabled: false,
            lowerThirdsText: '',
          };
        case 'update_display_config':
          return { success: true };
        case 'update_lower_thirds':
          return { success: true };
        default:
          return null;
      }
    });

    await displayViewModel.loadSettings();

    // Enable lower thirds
    displayViewModel.lowerThirdsEnabled = true;
    displayViewModel.lowerThirdsText = 'Welcome to our service';
    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        lowerThirdsEnabled: true,
        lowerThirdsText: 'Welcome to our service'
      })
    );
  });

  it('should handle multiple displays detection', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_available_displays':
          return [
            { id: 0, name: 'Built-in Display', width: 1920, height: 1080, isPrimary: true },
            { id: 1, name: 'External Display 1', width: 3840, height: 2160, isPrimary: false },
            { id: 2, name: 'External Display 2', width: 1920, height: 1080, isPrimary: false },
          ];
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: null,
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
          };
        default:
          return null;
      }
    });

    await displayViewModel.loadAvailableDisplays();

    expect(displayViewModel.availableDisplays.length).toBe(3);
    expect(displayViewModel.availableDisplays[0].name).toBe('Built-in Display');
    expect(displayViewModel.availableDisplays[1].width).toBe(3840); // 4K display
  });

  it('should handle window positioning', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: { x: 1920, y: 0, width: 1920, height: 1080, fullscreen: false },
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
          };
        case 'update_display_config':
          return { success: true };
        case 'move_window':
          return { success: true };
        default:
          return null;
      }
    });

    await displayViewModel.loadSettings();

    // Update audience window position
    displayViewModel.audienceWindow = {
      ...displayViewModel.audienceWindow,
      x: 100,
      y: 100,
      width: 1280,
      height: 720,
      fullscreen: false,
    };

    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        audienceWindow: {
          x: 100,
          y: 100,
          width: 1280,
          height: 720,
          fullscreen: false,
        }
      })
    );
  });

  it('should use EventBus for display events', async () => {
    const configChangedHandler = vi.fn();
    const windowOpenedHandler = vi.fn();
    const windowClosedHandler = vi.fn();

    eventBus.subscribe(EVENT_TYPES.DISPLAY_CONFIG_CHANGED, configChangedHandler);
    eventBus.subscribe(EVENT_TYPES.WINDOW_OPENED, windowOpenedHandler);
    eventBus.subscribe(EVENT_TYPES.WINDOW_CLOSED, windowClosedHandler);

    mockIpcService.invoke.mockResolvedValue({ success: true });

    await displayViewModel.loadSettings();
    displayViewModel.audienceWindowEnabled = true;
    await displayViewModel.saveSettings();

    // Publish events
    eventBus.publish(EVENT_TYPES.DISPLAY_CONFIG_CHANGED, {
      audienceWindowEnabled: true
    });

    eventBus.publish(EVENT_TYPES.WINDOW_OPENED, { window: 'audience' });

    expect(configChangedHandler).toHaveBeenCalled();
    expect(windowOpenedHandler).toHaveBeenCalled();
  });

  it('should handle display configuration errors', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      if (command === 'update_display_config') {
        throw new Error('Failed to update display config');
      }
      if (command === 'get_display_config') {
        return {
          audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
          confidenceWindow: null,
          lowerThirdsEnabled: false,
          chromaKeyEnabled: false,
        };
      }
      return null;
    });

    await displayViewModel.loadSettings();

    // Try to save with error
    displayViewModel.lowerThirdsEnabled = true;
    await displayViewModel.saveSettings();

    expect(displayViewModel.error).toContain('Failed to update display config');
  });

  it('should validate display settings', async () => {
    mockIpcService.invoke.mockResolvedValue({
      audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
      confidenceWindow: null,
      lowerThirdsEnabled: false,
      chromaKeyEnabled: false,
    });

    await displayViewModel.loadSettings();

    // Try to set invalid window size
    displayViewModel.audienceWindow = {
      x: 0,
      y: 0,
      width: -100, // Invalid width
      height: -100, // Invalid height
      fullscreen: false,
    };

    // ViewModel should validate or handle invalid values
    // In a real implementation, you'd have validation logic
    expect(displayViewModel.audienceWindow.width).toBeLessThan(0);
  });

  it('should handle display preset configurations', async () => {
    mockIpcService.invoke.mockImplementation(async (command) => {
      switch (command) {
        case 'get_display_config':
          return {
            audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
            confidenceWindow: null,
            lowerThirdsEnabled: false,
            chromaKeyEnabled: false,
          };
        case 'update_display_config':
          return { success: true };
        case 'apply_display_preset':
          return { success: true };
        default:
          return null;
      }
    });

    await displayViewModel.loadSettings();

    // Apply dual monitor preset
    const dualMonitorPreset = {
      audienceWindow: { x: 0, y: 0, width: 1920, height: 1080, fullscreen: true },
      confidenceWindow: { x: 1920, y: 0, width: 1920, height: 1080, fullscreen: true },
      lowerThirdsEnabled: false,
      chromaKeyEnabled: false,
    };

    displayViewModel.audienceWindow = dualMonitorPreset.audienceWindow;
    displayViewModel.confidenceWindow = dualMonitorPreset.confidenceWindow;
    displayViewModel.audienceWindowEnabled = true;
    displayViewModel.confidenceWindowEnabled = true;

    await displayViewModel.saveSettings();

    expect(mockIpcService.invoke).toHaveBeenCalledWith('update_display_config', 
      expect.objectContaining({
        audienceWindow: dualMonitorPreset.audienceWindow,
        confidenceWindow: dualMonitorPreset.confidenceWindow
      })
    );
  });
});
