/**
 * Base ViewModel Interface
 * All ViewModels should implement this interface
 */

export interface IViewModel {
  /**
   * Initialize the ViewModel
   * Called after construction to set up event subscriptions
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources and unsubscribe from events
   * Called when the ViewModel is being destroyed
   */
  dispose?(): void;
}
