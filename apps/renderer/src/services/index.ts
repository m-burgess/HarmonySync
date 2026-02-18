/**
 * Central export for all services
 * All services are exported from this file for easy imports
 */

import { container } from '../di/Container';
import { IpcService } from './IpcService';
import { EventBusService } from './EventBusService';
import { FileService } from './FileService';
import { DisplayService } from './DisplayService';
import { SlideService } from './SlideService';
import { ServiceOrderService } from './ServiceOrderService';
import { TimerService } from './TimerService';
import { WebAudioService } from './WebAudioService';

export { IpcService, EventBusService, WebAudioService, FileService, DisplayService, SlideService, ServiceOrderService, TimerService };
export { EVENT_TYPES } from './EventBusService';

// Default exports for backward compatibility
export { default as IpcServiceDefault } from './IpcService';
export { default as EventBusServiceDefault } from './EventBusService';
export { default as FileServiceDefault } from './FileService';
export { default as DisplayServiceDefault } from './DisplayService';
export { default as SlideServiceDefault } from './SlideService';
export { default as ServiceOrderServiceDefault } from './ServiceOrderService';
export { default as TimerServiceDefault } from './TimerService';

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
  // Use WebAudioService instead of native AudioService
  container.register('audioService', WebAudioService, ['ipcService'], true);
  container.register('fileService', FileService, ['ipcService'], true);
  container.register('displayService', DisplayService, ['ipcService'], true);
  container.register('slideService', SlideService, ['ipcService'], true);
  container.register('serviceOrderService', ServiceOrderService, ['ipcService', 'fileService'], true);
  container.register('timerService', TimerService, ['ipcService'], true);

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
