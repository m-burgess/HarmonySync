/**
 * Test Helper Utilities
 *
 * Provides common utilities and factories for creating test fixtures,
 * mock objects, and test data.
 */

/**
 * Test Helper Utilities
 *
 * Provides common utilities and factories for creating test fixtures,
 * mock objects, and test data.
 */

import {
  IServiceContext,
  MockFileSystem,
  MockElectronApp,
  MockLogger,
  MockEventBus,
  MockHttpClient,
  MockDatabase
} from '../types/testing';
import { jest } from '@jest/globals';
// ServiceConfig is a lightweight test config shape; declare as any here to avoid cross-package type resolution.
type ServiceConfig = any;

// ==================== FS / Service Tracking Helpers ====================
const fs = require('fs-extra');
import path from 'path';
const tempDirs: string[] = [];
const trackedServices: Array<{ dispose?: () => Promise<void> | void }> = [];

export async function createTempDir(prefix = 'test-'): Promise<string> {
  const dir = await fs.mkdtemp(path.join((process.env.TMPDIR || '/tmp'), prefix));
  tempDirs.push(dir);
  return dir;
}

export function trackService(svc: { dispose?: () => Promise<void> | void } | null | undefined) {
  if (svc) trackedServices.push(svc);
}

export async function cleanupAll(): Promise<void> {
  for (let i = trackedServices.length - 1; i >= 0; i--) {
    const s = trackedServices[i];
    try {
      if (s && typeof s.dispose === 'function') {
        await Promise.resolve(s.dispose());
      }
    } catch (err) {
      // ignore
    }
  }

  for (const d of tempDirs) {
    try {
      await fs.remove(d);
    } catch (err) {
      // ignore
    }
  }

  tempDirs.length = 0;
  trackedServices.length = 0;

  try { jest.useRealTimers(); } catch {}
  try { jest.resetAllMocks(); } catch {}
  try { jest.resetModules(); } catch {}
}


// ==================== Test Context Factory ====================

/**
 * Create a complete test service context with all mocks
 * @param overrides - Override specific dependencies
 * @returns Service context for testing
 */
export function createTestServiceContext(overrides?: Partial<IServiceContext>): IServiceContext {
  const fileSystem = new MockFileSystem();
  const electronApp = new MockElectronApp();
  const logger = new MockLogger();
  const eventBus = new MockEventBus();
  const httpClient = new MockHttpClient();
  const database = new MockDatabase();

  return {
    fileSystem,
    electronApp,
    logger,
    eventBus,
    httpClient,
    database,
    ...overrides
  };
}

/**
 * Create a minimal service config for testing
 * @param overrides - Override specific config values
 * @returns Service config
 */
export function createTestServiceConfig(overrides?: Partial<ServiceConfig>): ServiceConfig {
  return {
    enabled: true,
    logLevel: 'error', // Suppress logs in tests by default
    ...overrides
  };
}

// ==================== Mock Data Factories ====================

/**
 * Create test audio metadata
 */
export function createTestAudioMetadata(overrides?: any) {
  return {
    duration: 180,
    bitrate: 128000,
    sampleRate: 44100,
    channels: 2,
    format: 'mp3',
    codec: 'mp3',
    ...overrides
  };
}

/**
 * Create test video metadata
 */
export function createTestVideoMetadata(overrides?: any) {
  return {
    duration: 120,
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 5000000,
    format: 'mp4',
    codec: 'h264',
    hasAudio: true,
    ...overrides
  };
}

/**
 * Create test slide content
 */
export function createTestSlideContent(overrides?: any) {
  return {
    type: 'text' as const,
    content: 'Test Slide Content',
    styles: {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      backgroundColor: '#000000'
    },
    ...overrides
  };
}

/**
 * Create test scheduled event
 */
export function createTestScheduledEvent(overrides?: any) {
  return {
    id: 'event-' + Math.random().toString(36).substring(7),
    title: 'Test Event',
    description: 'Test event description',
    startTime: new Date(),
    type: 'service' as const,
    ...overrides
  };
}

/**
 * Create test macro
 */
export function createTestMacro(overrides?: any) {
  return {
    id: 'macro-' + Math.random().toString(36).substring(7),
    name: 'Test Macro',
    description: 'Test macro description',
    actions: [],
    enabled: true,
    ...overrides
  };
}

/**
 * Create test display config
 */
export function createTestDisplayConfig(overrides?: any) {
  return {
    id: 'display-' + Math.random().toString(36).substring(7),
    name: 'Test Display',
    type: 'audience' as const,
    enabled: true,
    bounds: {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    },
    ...overrides
  };
}

// ==================== File System Test Helpers ====================

/**
 * Set up a mock file system with common test files
 * @param fs - Mock file system instance
 */
export function setupTestFileSystem(fs: MockFileSystem): void {
  // Create common directories
  fs.addDirectory('/mock/userData');
  fs.addDirectory('/mock/temp');
  fs.addDirectory('/mock/documents');
  
  // Add common test files
  fs.addFile('/mock/userData/config.json', JSON.stringify({ version: '1.0.0' }));
  fs.addFile('/mock/temp/test.txt', 'test content');
}

/**
 * Create a temporary test directory structure
 * @param fs - Mock file system instance
 * @param structure - Directory structure object
 */
export function createTestDirectoryStructure(
  fs: MockFileSystem,
  structure: { [path: string]: string | null }
): void {
  for (const [path, content] of Object.entries(structure)) {
    if (content === null) {
      // It's a directory
      fs.addDirectory(path);
    } else {
      // It's a file
      fs.addFile(path, content);
    }
  }
}

// ==================== Async Test Helpers ====================

/**
 * Wait for a condition to be true
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms
 * @param interval - Check interval in ms
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Event Testing Helpers ====================

/**
 * Capture events emitted during a test
 * @param emitter - Event emitter to monitor
 * @param eventName - Event name to capture
 * @returns Array of captured events and a cleanup function
 */
export function captureEvents(emitter: any, eventName: string): {
  events: any[];
  cleanup: () => void;
} {
  const events: any[] = [];
  const handler = (...args: any[]) => {
    events.push(args.length === 1 ? args[0] : args);
  };
  
  emitter.on(eventName, handler);
  
  return {
    events,
    cleanup: () => emitter.removeListener(eventName, handler)
  };
}

/**
 * Wait for a specific event to be emitted
 * @param emitter - Event emitter to monitor
 * @param eventName - Event name to wait for
 * @param timeout - Maximum time to wait in ms
 */
export function waitForEvent(
  emitter: any,
  eventName: string,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event '${eventName}' after ${timeout}ms`));
    }, timeout);
    
    emitter.once(eventName, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ==================== Mock Function Helpers ====================

/**
 * Create a mock function that returns different values on successive calls
 * @param values - Array of values to return
 */
export function createSequentialMock<T>(...values: T[]): jest.Mock {
  let index = 0;
  return jest.fn(() => {
    if (index >= values.length) {
      throw new Error('Sequential mock called more times than values provided');
    }
    return values[index++];
  });
}

/**
 * Create a mock function that throws an error
 * @param error - Error to throw
 */
export function createThrowingMock(error: Error | string): jest.Mock {
  const err = typeof error === 'string' ? new Error(error) : error;
  return jest.fn(() => {
    throw err;
  });
}

// ==================== Assertion Helpers ====================

/**
 * Assert that a promise rejects with a specific error message
 * @param promise - Promise to test
 * @param expectedMessage - Expected error message substring
 */
export async function expectRejection(
  promise: Promise<any>,
  expectedMessage: string
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error: any) {
    if (!error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}", but got: ${error.message}`
      );
    }
  }
}

/**
 * Assert that an object matches a partial structure
 * @param actual - Actual object
 * @param expected - Expected partial structure
 */
export function expectPartialMatch(actual: any, expected: any): void {
  for (const key in expected) {
    if (expected.hasOwnProperty(key)) {
      if (typeof expected[key] === 'object' && expected[key] !== null) {
        expectPartialMatch(actual[key], expected[key]);
      } else {
        if (actual[key] !== expected[key]) {
          throw new Error(
            `Expected ${key} to be ${expected[key]}, but got ${actual[key]}`
          );
        }
      }
    }
  }
}

// ==================== Test Isolation Helpers ====================

/**
 * Create an isolated test environment
 * Useful for tests that need complete isolation
 */
export class TestEnvironment {
  private cleanupFunctions: Array<() => void | Promise<void>> = [];

  /**
   * Register a cleanup function to be called when environment is disposed
   */
  registerCleanup(fn: () => void | Promise<void>): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Clean up the test environment
   */
  async cleanup(): Promise<void> {
    for (const fn of this.cleanupFunctions.reverse()) {
      await fn();
    }
    this.cleanupFunctions = [];
  }
}

/**
 * Create a test environment with automatic cleanup
 * @param setup - Setup function
 * @returns Test environment
 */
export function createTestEnvironment(
  setup?: (env: TestEnvironment) => void | Promise<void>
): TestEnvironment {
  const env = new TestEnvironment();
  if (setup) {
    setup(env);
  }
  return env;
}

// ==================== Performance Testing Helpers ====================

/**
 * Measure execution time of a function
 * @param fn - Function to measure
 * @returns Execution time in milliseconds
 */
export async function measureTime<T>(fn: () => T | Promise<T>): Promise<{
  result: T;
  duration: number;
}> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Assert that a function completes within a time limit
 * @param fn - Function to test
 * @param maxDuration - Maximum duration in milliseconds
 */
export async function expectTimeLessThan<T>(
  fn: () => T | Promise<T>,
  maxDuration: number
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  if (duration > maxDuration) {
    throw new Error(
      `Expected function to complete in less than ${maxDuration}ms, but took ${duration}ms`
    );
  }
  return result;
}
