/**
 * Base Service Class
 * Abstract base class providing common functionality for all services
 * 
 * Principles:
 * - Encapsulation: Protected members for derived classes
 * - Single Responsibility: Common service lifecycle management
 * - Open/Closed: Open for extension, closed for modification
 */

import type { IService } from './IService';

export abstract class BaseService implements IService {
  /**
   * Service initialization state
   */
  protected isInitialized: boolean = false;

  /**
   * Service name for logging
   */
  protected abstract readonly serviceName: string;

  /**
   * Initialize the service
   * Derived classes should override this method
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }

    this.log('Initializing...');
    await this.onInitialize();
    this.isInitialized = true;
    this.log('Initialized');
  }

  /**
   * Cleanup resources
   * Derived classes should override this method
   */
  public dispose(): void {
    if (!this.isInitialized) {
      return;
    }

    this.log('Disposing...');
    this.onDispose();
    this.isInitialized = false;
    this.log('Disposed');
  }

  /**
   * Hook for derived classes to implement initialization logic
   * @protected
   */
  protected async onInitialize(): Promise<void> {
    // Override in derived classes
  }

  /**
   * Hook for derived classes to implement disposal logic
   * @protected
   */
  protected onDispose(): void {
    // Override in derived classes
  }

  /**
   * Logging helper
   * @protected
   */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.serviceName}]`, message, ...args);
  }

  /**
   * Error logging helper
   * @protected
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.serviceName}] ERROR:`, message, error);
  }

  /**
   * Warning logging helper
   * @protected
   */
  protected logWarn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.serviceName}] WARNING:`, message, ...args);
  }

  /**
   * Ensure service is initialized
   * @protected
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.serviceName} is not initialized. Call initialize() first.`);
    }
  }

  /**
   * Handle errors consistently
   * @protected
   */
  protected handleError(operation: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logError(`${operation} failed`, error);
    throw new Error(`${this.serviceName}: ${operation} failed - ${errorMessage}`);
  }
}
