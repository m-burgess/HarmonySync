/**
 * Base Service Interface
 * All services should implement this interface
 */

export interface IService {
  /**
   * Initialize the service
   * Called after construction to set up any async resources
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources
   * Called when the service is being destroyed
   */
  dispose?(): void;
}
