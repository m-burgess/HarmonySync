/**
 * Central export for all services
 * All services are exported from this file for easy imports
 */

import { container } from '../di/Container';
import { IpcService } from './IpcService';
import { EventBusService } from './EventBusService';
import { AudioService } from './AudioService';
import { FileService } from './FileService';
import { DisplayService } from './DisplayService';
import { SlideService } from './SlideService';
import { SetlistService } from './SetlistService';

export { IpcService, EventBusService, AudioService, FileService, DisplayService, SlideService, SetlistService };
export { EVENT_TYPES } from './EventBusService';

// Default exports for backward compatibility
export { default as IpcServiceDefault } from './IpcService';
export { default as EventBusServiceDefault } from './EventBusService';
export { default as AudioServiceDefault } from './AudioService';
export { default as FileServiceDefault } from './FileService';
export { default as DisplayServiceDefault } from './DisplayService';
export { default as SlideServiceDefault } from './SlideService';
export { default as SetlistServiceDefault } from './SetlistService';

/**
 * Setup all services in the DI container
 * Call this once at application startup
 */
export function setupServices(): void {
  // Register EventBus service first (no dependencies)
  container.register('eventBusService', EventBusService, [], true);

  // Register IPC service (foundation)
  container.register('ipcService', IpcService, [], true);

  // Register domain services (depend on IPC service)
  container.register('audioService', AudioService, ['ipcService'], true);
  container.register('fileService', FileService, ['ipcService'], true);
  container.register('displayService', DisplayService, ['ipcService'], true);
  container.register('slideService', SlideService, ['ipcService'], true);
  container.register('setlistService', SetlistService, ['ipcService', 'fileService'], true);

  console.log('[ServiceRegistry] All services registered successfully');
}

/**
 * Get a service from the container
 * @param {string} name - Service name
 * @returns {*} Service instance
 */
export function getService(name: string): any {
  return container.resolve(name);
}

/**
 * Clear all services (useful for testing)
 */
export function clearServices(): void {
  container.clear();
}

export default {
  setupServices,
  getService,
  clearServices
};
