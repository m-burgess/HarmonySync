/**
 * Service Registry - Bootstrap and register all services in DI container
 * 
 * This module sets up the dependency injection container with all services.
 * Import and call setupServices() at application startup.
 */
import { container } from '../di/Container.js';
import IpcService from './IpcService.js';
import AudioService from './AudioService.js';
import FileService from './FileService.js';
import DisplayService from './DisplayService.js';
import SlideService from './SlideService.js';
import SetlistService from './SetlistService.js';
import EventBusService from './EventBusService.js';

/**
 * Setup all services in the DI container
 * Call this once at application startup
 */
export function setupServices() {
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
export function getService(name) {
  return container.resolve(name);
}

/**
 * Clear all services (useful for testing)
 */
export function clearServices() {
  container.clear();
}

export default {
  setupServices,
  getService,
  clearServices
};
