// Forwarder: implementation moved to apps/electron-app/services/event-trigger-service.ts
export * from '../../apps/electron-app/services/event-trigger-service';
export { default } from '../../apps/electron-app/services/event-trigger-service';

// ==================== Singleton Export ====================

let eventTriggerServiceInstance: EventTriggerService | null = null;

/**
 * Get or create the event trigger service singleton
 */
export function getEventTriggerService(config?: ServiceConfig): EventTriggerService {
  if (!eventTriggerServiceInstance) {
    eventTriggerServiceInstance = new EventTriggerService(config);
  }
  return eventTriggerServiceInstance;
}

// Export event types for convenience
export { EventType as EVENT_TYPES };

// Export for backward compatibility
export default EventTriggerService;
