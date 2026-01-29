/**
 * ViewModels export
 * Central export point for all ViewModels
 */

import { container } from '../di/Container';
import { AudioViewModel } from './AudioViewModel';
import { ServiceOrderViewModel } from './ServiceOrderViewModel';
import { SlideViewModel } from './SlideViewModel';
import { DisplayViewModel } from './DisplayViewModel';
import { MixerViewModel } from './MixerViewModel';

export { AudioViewModel, ServiceOrderViewModel, SlideViewModel, DisplayViewModel, MixerViewModel };

/**
 * Setup all ViewModels in the DI container
 * Call this after setupServices()
 */
export function setupViewModels(): void {
  // Register ViewModels (depend on services)
  container.register('audioViewModel', AudioViewModel, ['audioService'], true);
  container.register('serviceOrderViewModel', ServiceOrderViewModel, 
    ['serviceOrderService', 'audioService', 'displayService', 'slideService'], true);
  container.register('slideViewModel', SlideViewModel, 
    ['slideService', 'displayService'], true);
  container.register('displayViewModel', DisplayViewModel, 
    ['displayService', 'fileService', 'ipcService'], true);
  container.register('mixerViewModel', MixerViewModel, 
    ['audioService'], true);

  console.log('[ViewModelRegistry] All ViewModels registered successfully');
}

/**
 * Get a ViewModel from the container
 * @param {string} name - ViewModel name
 * @returns {*} ViewModel instance
 */
export function getViewModel(name: string): any {
  return container.resolve(name);
}

export default {
  AudioViewModel,
  ServiceOrderViewModel,
  SlideViewModel,
  DisplayViewModel,
  MixerViewModel,
  setupViewModels,
  getViewModel,
};
