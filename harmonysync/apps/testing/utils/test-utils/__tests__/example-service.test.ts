/**
 * Example Test Demonstrating New Testing Patterns
 * 
 * This test demonstrates how to use the new testing abstractions and utilities
 * to write effective unit tests for services.
 */

import {
  createTestServiceContext,
  createTestServiceConfig,
  setupTestFileSystem,
  createTestDirectoryStructure,
  waitForEvent,
  captureEvents
} from '../test-helpers';
import {
  MockFileSystem,
  MockLogger,
  MockEventBus,
  IServiceContext
} from '../../types/testing';

/**
 * Example service that demonstrates testable design patterns
 */
class ExampleService {
  private context: IServiceContext;
  private initialized: boolean = false;

  constructor(context: IServiceContext) {
    this.context = context;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Use abstracted file system instead of direct fs-extra
    const fs = this.context.fileSystem!;
    const app = this.context.electronApp!;
    
    const configPath = `${app.getPath('userData')}/config.json`;
    const exists = await fs.pathExists(configPath);
    
    if (!exists) {
      await fs.writeFile(configPath, JSON.stringify({ initialized: true }));
    }

    this.initialized = true;
    this.context.logger?.info('Service initialized');
    this.context.eventBus?.publish('service:initialized', { service: 'example' });
  }

  async processFile(filePath: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const fs = this.context.fileSystem!;
    const content = await fs.readFile(filePath, 'utf-8') as string;
    const processed = content.toUpperCase();
    
    const outputPath = filePath.replace(/\.txt$/, '.processed.txt');
    await fs.writeFile(outputPath, processed);
    
    this.context.logger?.info(`Processed file: ${filePath}`);
    this.context.eventBus?.publish('file:processed', { path: filePath });
    
    return outputPath;
  }

  async fetchData(url: string): Promise<any> {
    const http = this.context.httpClient!;
    const response = await http.get(url);
    return response.data;
  }

  dispose(): void {
    this.initialized = false;
    this.context.logger?.info('Service disposed');
  }
}

// ==================== Tests ====================

describe('ExampleService - Testing Pattern Demonstration', () => {
  let context: IServiceContext;
  let service: ExampleService;

  beforeEach(() => {
    // Create a fresh test context for each test
    context = createTestServiceContext();
    service = new ExampleService(context);
    
    // Set up mock file system with test data
    setupTestFileSystem(context.fileSystem as MockFileSystem);
  });

  afterEach(() => {
    // Clean up after each test
    service.dispose();
    (context.fileSystem as MockFileSystem).clear();
    (context.logger as MockLogger).clear();
    (context.eventBus as MockEventBus).clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      
      // Verify config file was created
      const fs = context.fileSystem!;
      const configPath = '/mock/userData/config.json';
      const exists = await fs.pathExists(configPath);
      expect(exists).toBe(true);
    });

    it('should log initialization', async () => {
      await service.initialize();
      
      const logger = context.logger as MockLogger;
      expect(logger.hasLog('info', 'Service initialized')).toBe(true);
    });

    it('should emit initialization event', async () => {
      const eventBus = context.eventBus as MockEventBus;
      const { events, cleanup } = captureEvents(eventBus, 'service:initialized');
      
      await service.initialize();
      
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ service: 'example' });
      
      cleanup();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const logger = context.logger as MockLogger;
      logger.clear();
      
      await service.initialize();
      
      // Should not log again
      expect(logger.hasLog('info', 'Service initialized')).toBe(false);
    });

    it('should handle missing config file gracefully', async () => {
      // Clear the file system
      (context.fileSystem as MockFileSystem).clear();
      (context.fileSystem as MockFileSystem).addDirectory('/mock/userData');
      
      await service.initialize();
      
      // Should create config file
      const fs = context.fileSystem!;
      const configPath = '/mock/userData/config.json';
      const exists = await fs.pathExists(configPath);
      expect(exists).toBe(true);
    });
  });

  describe('File Processing', () => {
    beforeEach(async () => {
      await service.initialize();
      
      // Set up test files
      const fs = context.fileSystem as MockFileSystem;
      fs.addFile('/mock/test/input.txt', 'hello world');
    });

    it('should process file content', async () => {
      const outputPath = await service.processFile('/mock/test/input.txt');
      
      expect(outputPath).toBe('/mock/test/input.processed.txt');
      
      const fs = context.fileSystem!;
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toBe('HELLO WORLD');
    });

    it('should log file processing', async () => {
      await service.processFile('/mock/test/input.txt');
      
      const logger = context.logger as MockLogger;
      expect(logger.hasLog('info', 'Processed file')).toBe(true);
    });

    it('should emit file processed event', async () => {
      const eventBus = context.eventBus as MockEventBus;
      const { events, cleanup } = captureEvents(eventBus, 'file:processed');
      
      await service.processFile('/mock/test/input.txt');
      
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ path: '/mock/test/input.txt' });
      
      cleanup();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new ExampleService(context);
      
      await expect(
        uninitializedService.processFile('/mock/test/input.txt')
      ).rejects.toThrow('Service not initialized');
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        service.processFile('/mock/test/nonexistent.txt')
      ).rejects.toThrow('no such file');
    });
  });

  describe('HTTP Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should fetch data from URL', async () => {
      const mockData = { id: 1, name: 'Test Data' };
      (context.httpClient as any).mockResponse('https://api.example.com/data', {
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {}
      });
      
      const result = await service.fetchData('https://api.example.com/data');
      
      expect(result).toEqual(mockData);
    });

    it('should handle HTTP errors', async () => {
      // Don't mock a response - let it throw
      await expect(
        service.fetchData('https://api.example.com/missing')
      ).rejects.toThrow('No mock response configured');
    });
  });

  describe('Event Handling', () => {
    it('should wait for async events', async () => {
      const eventBus = context.eventBus as MockEventBus;
      
      // Start listening for event before it's emitted
      const eventPromise = waitForEvent(eventBus, 'service:initialized');
      
      await service.initialize();
      
      // Wait for and verify the event
      const eventData = await eventPromise;
      expect(eventData).toEqual({ service: 'example' });
    });

    it('should handle multiple events', async () => {
      await service.initialize();
      
      const eventBus = context.eventBus as MockEventBus;
      const { events, cleanup } = captureEvents(eventBus, 'file:processed');
      
      const fs = context.fileSystem as MockFileSystem;
      fs.addFile('/mock/file1.txt', 'content1');
      fs.addFile('/mock/file2.txt', 'content2');
      fs.addFile('/mock/file3.txt', 'content3');
      
      await service.processFile('/mock/file1.txt');
      await service.processFile('/mock/file2.txt');
      await service.processFile('/mock/file3.txt');
      
      expect(events).toHaveLength(3);
      
      cleanup();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete workflow', async () => {
      // Set up test directory structure
      const fs = context.fileSystem as MockFileSystem;
      createTestDirectoryStructure(fs, {
        '/mock/project': null, // directory
        '/mock/project/file1.txt': 'test content 1',
        '/mock/project/file2.txt': 'test content 2',
        '/mock/project/subdir': null, // directory
        '/mock/project/subdir/file3.txt': 'test content 3'
      });
      
      // Initialize service
      await service.initialize();
      
      // Process multiple files
      const results = await Promise.all([
        service.processFile('/mock/project/file1.txt'),
        service.processFile('/mock/project/file2.txt'),
        service.processFile('/mock/project/subdir/file3.txt')
      ]);
      
      // Verify all files were processed
      expect(results).toHaveLength(3);
      
      // Verify processed files exist
      for (const resultPath of results) {
        const exists = await fs.pathExists(resultPath);
        expect(exists).toBe(true);
      }
      
      // Verify logging
      const logger = context.logger as MockLogger;
      const processLogs = logger.logs.filter(log => 
        log.level === 'info' && log.message.includes('Processed file')
      );
      expect(processLogs).toHaveLength(3);
    });
  });
});
