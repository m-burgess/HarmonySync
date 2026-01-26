/**
 * Lightweight Dependency Injection Container for HarmonySync
 * 
 * Usage:
 *   const container = new Container();
 *   container.register('audioService', AudioService, ['ipcService']);
 *   container.register('audioViewModel', AudioViewModel, ['audioService']);
 *   const viewModel = container.resolve('audioViewModel');
 */
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service with its dependencies
   * @param {string} name - Service name
   * @param {Function} factory - Constructor or factory function
   * @param {Array<string>} deps - Array of dependency names
   * @param {boolean} singleton - Whether to create single instance (default: true)
   */
  register(name, factory, deps = [], singleton = true) {
    this.services.set(name, {
      factory,
      deps,
      singleton
    });
  }

  /**
   * Register a singleton instance directly
   * @param {string} name - Service name
   * @param {*} instance - The instance to register
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
  }

  /**
   * Resolve a service and its dependencies
   * @param {string} name - Service name
   * @returns {*} The resolved service instance
   */
  resolve(name) {
    // Check if already resolved as singleton
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered in DI container`);
    }

    // Resolve dependencies
    const resolvedDeps = service.deps.map(dep => this.resolve(dep));

    // Create instance
    const instance = new service.factory(...resolvedDeps);

    // Cache if singleton
    if (service.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Clear all singletons (useful for testing)
   */
  clear() {
    this.singletons.clear();
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name) || this.singletons.has(name);
  }
}

// Export singleton instance
export const container = new Container();
export default Container;
