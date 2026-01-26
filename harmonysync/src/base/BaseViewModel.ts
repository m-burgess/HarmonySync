/**
 * Base ViewModel Class
 * Abstract base class providing common functionality for all ViewModels
 * 
 * Principles:
 * - Encapsulation: Protected members for derived classes
 * - Single Responsibility: Common ViewModel lifecycle and state management
 * - Open/Closed: Open for extension, closed for modification
 * - MobX integration for reactive state management
 */

import type { IViewModel } from './IViewModel';
import type { UnsubscribeFunction } from '../types';

export abstract class BaseViewModel implements IViewModel {
  /**
   * ViewModel initialization state
   */
  protected isInitialized: boolean = false;

  /**
   * ViewModel name for logging
   */
  protected abstract readonly viewModelName: string;

  /**
   * Collection of event unsubscribe functions
   * Automatically cleaned up on dispose
   */
  private unsubscribers: UnsubscribeFunction[] = [];

  /**
   * Constructor
   * Derived classes should call makeObservable(this) after super()
   */
  constructor() {
    // MobX observability is set up in derived classes
    // because decorators need to be applied to the specific class
  }

  /**
   * Initialize the ViewModel
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
   * Cleanup resources and unsubscribe from events
   */
  public dispose(): void {
    if (!this.isInitialized) {
      return;
    }

    this.log('Disposing...');
    
    // Unsubscribe from all events
    this.unsubscribeAll();
    
    // Call derived class cleanup
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
   * Register an event subscription for automatic cleanup
   * @protected
   */
  protected addSubscription(unsubscribe: UnsubscribeFunction): void {
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Unsubscribe from all registered events
   * @private
   */
  private unsubscribeAll(): void {
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch (error) {
        this.logError('Error unsubscribing', error);
      }
    }
    this.unsubscribers = [];
  }

  /**
   * Logging helper
   * @protected
   */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.viewModelName}]`, message, ...args);
  }

  /**
   * Error logging helper
   * @protected
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.viewModelName}] ERROR:`, message, error);
  }

  /**
   * Warning logging helper
   * @protected
   */
  protected logWarn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.viewModelName}] WARNING:`, message, ...args);
  }

  /**
   * Ensure ViewModel is initialized
   * @protected
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.viewModelName} is not initialized. Call initialize() first.`);
    }
  }

  /**
   * Handle errors consistently
   * Updates error state and logs
   * @protected
   */
  protected handleError(operation: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logError(`${operation} failed`, error);
    
    // Derived classes can override this to update their error state
    this.onError(operation, errorMessage);
  }

  /**
   * Hook for derived classes to handle errors
   * Can be overridden to update observable error state
   * @protected
   */
  protected onError(_operation: string, _errorMessage: string): void {
    // Override in derived classes to update error state
  }

  /**
   * Safe async operation wrapper
   * Catches and handles errors consistently
   * @protected
   */
  protected async safeAsync<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(operation, error);
      return null;
    }
  }
}
