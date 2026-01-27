/**
 * Lightweight Dependency Injection Container for HarmonySync
 * 
 * TypeScript implementation with type-safe generics for service registration and resolution.
 * 
 * OOP Principles:
 * - Encapsulation: Private service registry and singleton cache
 * - Single Responsibility: Only manages dependency injection
 * - Type Safety: Generic type parameters for service resolution
 * 
 * Usage:
 *   const container = new Container();
 *   container.register('audioService', AudioService, ['ipcService']);
 *   container.register('audioViewModel', AudioViewModel, ['audioService']);
 *   const viewModel = container.resolve<AudioViewModel>('audioViewModel');
 */

/**
 * Service registration configuration
 */
interface ServiceConfig<T = unknown> {
  /** Constructor or factory function */
  factory: new (...args: any[]) => T;
  /** Array of dependency names */
  deps: string[];
  /** Whether to create single instance (default: true) */
  singleton: boolean;
}

/**
 * Dependency Injection Container
 */
export class Container {
  /**
   * Registry of service configurations
   */
  private readonly services: Map<string, ServiceConfig> = new Map();

  /**
   * Cache of singleton instances
   */
  private readonly singletons: Map<string, unknown> = new Map();

  /**
   * Register a service with its dependencies
   * @param name - Service name
   * @param factory - Constructor or factory function
   * @param deps - Array of dependency names
   * @param singleton - Whether to create single instance (default: true)
   */
  public register<T>(
    name: string,
    factory: new (...args: any[]) => T,
    deps: string[] = [],
    singleton: boolean = true
  ): void {
    this.services.set(name, {
      factory,
      deps,
      singleton,
    });
  }

  /**
   * Register a singleton instance directly
   * @param name - Service name
   * @param instance - The instance to register
   */
  public registerInstance<T>(name: string, instance: T): void {
    this.singletons.set(name, instance);
  }

  /**
   * Resolve a service and its dependencies
   * @param name - Service name
   * @returns The resolved service instance
   */
  public resolve<T = unknown>(name: string): T {
    // Check if already resolved as singleton
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered in DI container`);
    }

    // Resolve dependencies recursively
    const resolvedDeps = service.deps.map(dep => this.resolve(dep));

    // Create instance
    const instance = new service.factory(...resolvedDeps);

    // Cache if singleton
    if (service.singleton) {
      this.singletons.set(name, instance);
    }

    return instance as T;
  }

  /**
   * Check if a service is registered
   * @param name - Service name
   * @returns True if registered
   */
  public has(name: string): boolean {
    return this.services.has(name) || this.singletons.has(name);
  }

  /**
   * Clear all singletons (useful for testing)
   */
  public clear(): void {
    this.singletons.clear();
  }

  /**
   * Clear a specific singleton
   * @param name - Service name
   */
  public clearSingleton(name: string): void {
    this.singletons.delete(name);
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  public getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all singleton instance names
   * @returns Array of singleton names
   */
  public getSingletons(): string[] {
    return Array.from(this.singletons.keys());
  }
}

/**
 * Export singleton instance for global use
 */
export const container = new Container();

/**
 * Default export
 */
export default Container;
