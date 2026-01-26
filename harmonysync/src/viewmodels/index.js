/**
 * ViewModel Registry - Bootstrap and register all ViewModels in DI container
 * 
 * This module sets up ViewModels with their service dependencies.
 * Import and call setupViewModels() after setupServices().
 */
import { container } from '../di/Container.js';
import AudioViewModel from './AudioViewModel.js';

/**
 * Setup all ViewModels in the DI container
 * Call this after setupServices()
 */
export function setupViewModels() {
  // Register ViewModels (depend on services)
  container.register('audioViewModel', AudioViewModel, ['audioService'], true);

  console.log('[ViewModelRegistry] All ViewModels registered successfully');
}

/**
 * Get a ViewModel from the container
 * @param {string} name - ViewModel name
 * @returns {*} ViewModel instance
 */
export function getViewModel(name) {
  return container.resolve(name);
}

export default {
  setupViewModels,
  getViewModel
};
