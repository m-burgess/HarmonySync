/**
 * Event Trigger Service
 * Manages event-driven script execution with TypeScript OOP design
 * Allows scripts to automatically respond to application events
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService, ServiceConfig } from '../types/services';

// Import script service for execution
// Note: Dynamic import to avoid circular dependencies
let scriptServiceModule: any = null;

// ==================== Type Definitions ====================

/**
 * Event types that scripts can subscribe to
 */
export enum EventType {
  SLIDE_CHANGE = 'slideChange',
  SLIDE_LOAD = 'slideLoad',
  VIDEO_START = 'videoStart',
  VIDEO_END = 'videoEnd',
  VIDEO_PAUSE = 'videoPause',
  VIDEO_RESUME = 'videoResume',
  AUDIO_START = 'audioStart',
  AUDIO_END = 'audioEnd',
  AUDIO_PAUSE = 'audioPause',
  AUDIO_RESUME = 'audioResume',
  WINDOW_SHOW = 'windowShow',
  WINDOW_HIDE = 'windowHide',
  MACRO_EXECUTE = 'macroExecute',
  SCHEDULED_EVENT_START = 'scheduledEventStart',
  SCHEDULED_EVENT_END = 'scheduledEventEnd'
}

/**
 * Trigger configuration
 */
export interface Trigger {
  id: string;
  eventType: string;
  scriptId: string;
  scriptName: string;
  enabled: boolean;
  priority: number;
  condition: string | null;
  createdAt: string;
  lastExecuted: string | null;
  executionCount: number;
}

/**
 * Options for registering a trigger
 */
export interface TriggerOptions {
  enabled?: boolean;
  priority?: number;
  condition?: string;
}

/**
 * Event data passed to scripts
 */
export interface EventData {
  [key: string]: any;
}

/**
 * Execution result for a trigger
 */
export interface ExecutionResult {
  triggerId: string;
  scriptId: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Test result for a trigger
 */
export interface TestResult {
  success: boolean;
  result: any;
  trigger: Trigger;
}

/**
 * Trigger registry organized by event type
 */
export interface TriggerRegistry {
  [eventType: string]: Trigger[];
}

// ==================== Event Trigger Service Class ====================

/**
 * Event Trigger Service Implementation
 * Manages event-driven automation with trigger registration and execution
 * 
 * Note: This implements most of IEventTriggerService but cannot use "implements"
 * due to a method signature conflict with EventEmitter's emit() method.
 * The emit() method is implemented but with a different signature than the base class.
 */
export class EventTriggerService extends BaseElectronService {
  protected readonly serviceName = 'EventTriggerService';
  
  private triggersFile: string;
  private triggers: TriggerRegistry = {};
  
  constructor(config?: ServiceConfig) {
    super(config);
    this.triggersFile = path.join(app.getPath('userData'), 'event-triggers.json');
  }

  /**
   * Initialize the event trigger service
   */
  protected override async onInitialize(): Promise<void> {
    await this.loadTriggers();
    this.log('info', 'Event trigger service initialized');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.triggers = {};
    this.log('info', 'Event trigger service disposed');
  }

  // ==================== Storage Methods ====================

  /**
   * Load triggers from storage
   */
  private async loadTriggers(): Promise<void> {
    try {
      if (await fs.pathExists(this.triggersFile)) {
        const data = await fs.readJSON(this.triggersFile);
        this.triggers = data;
        this.log('debug', `Loaded ${Object.keys(this.triggers).length} trigger groups`);
      } else {
        this.triggers = {};
        this.log('debug', 'No existing triggers file found, starting with empty registry');
      }
    } catch (error) {
      this.log('error', 'Failed to load event triggers:', error);
      this.triggers = {};
    }
  }

  /**
   * Save triggers to storage
   */
  private async saveTriggers(): Promise<void> {
    try {
      await fs.writeJSON(this.triggersFile, this.triggers, { spaces: 2 });
      this.log('debug', 'Triggers saved to storage');
    } catch (error) {
      this.handleError('saveTriggers', error);
    }
  }

  // ==================== Script Service Integration ====================

  /**
   * Lazy load script service to avoid circular dependencies
   */
  private async getScriptService(): Promise<any> {
    if (!scriptServiceModule) {
      scriptServiceModule = await import('./script-service');
    }
    return scriptServiceModule;
  }

  // ==================== Public API Methods ====================

  /**
   * Register a script to an event
   * @param eventType - Event type to subscribe to
   * @param scriptId - Script ID to execute
   * @param options - Trigger options
   * @returns Promise resolving to trigger configuration
   */
  public async registerTrigger(
    eventType: string,
    scriptId: string,
    options: TriggerOptions = {}
  ): Promise<Trigger> {
    try {
      // Validate event type
      if (!this.isValidEventType(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }

      // Verify script exists
      const scriptService = await this.getScriptService();
      const script = await scriptService.getScript(scriptId);
      if (!script) {
        throw new Error(`Script not found: ${scriptId}`);
      }

      // Create trigger ID
      const triggerId = `${eventType}_${scriptId}_${Date.now()}`;

      // Create trigger configuration
      const trigger: Trigger = {
        id: triggerId,
        eventType,
        scriptId,
        scriptName: script.name,
        enabled: options.enabled !== false,
        priority: options.priority || 0,
        condition: options.condition || null,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        executionCount: 0
      };

      // Initialize event type array if needed
      if (!this.triggers[eventType]) {
        this.triggers[eventType] = [];
      }

      // Add trigger
      this.triggers[eventType].push(trigger);

      // Save to storage
      await this.saveTriggers();

      this.log('info', `Trigger registered: ${triggerId}`);
      return trigger;
    } catch (error) {
      this.handleError('registerTrigger', error);
    }
  }

  /**
   * Unregister a trigger
   * @param triggerId - Trigger ID to remove
   * @returns Promise resolving to success status
   */
  public async unregisterTrigger(triggerId: string): Promise<boolean> {
    try {
      let found = false;

      // Find and remove trigger
      for (const eventType in this.triggers) {
        const index = this.triggers[eventType].findIndex(t => t.id === triggerId);
        if (index !== -1) {
          this.triggers[eventType].splice(index, 1);
          found = true;
          break;
        }
      }

      if (found) {
        await this.saveTriggers();
        this.log('info', `Trigger unregistered: ${triggerId}`);
      }

      return found;
    } catch (error) {
      this.handleError('unregisterTrigger', error);
    }
  }

  /**
   * Get all triggers
   * @returns Promise resolving to all triggers grouped by event type
   */
  public async getAllTriggers(): Promise<TriggerRegistry> {
    return this.triggers;
  }

  /**
   * Get triggers for a specific event
   * @param eventType - Event type
   * @returns Promise resolving to triggers for the event
   */
  public async getTriggersForEvent(eventType: string): Promise<Trigger[]> {
    return this.triggers[eventType] || [];
  }

  /**
   * Enable a trigger
   * @param triggerId - Trigger ID
   * @returns Promise resolving to success status
   */
  public async enableTrigger(triggerId: string): Promise<boolean> {
    return await this.setTriggerEnabled(triggerId, true);
  }

  /**
   * Disable a trigger
   * @param triggerId - Trigger ID
   * @returns Promise resolving to success status
   */
  public async disableTrigger(triggerId: string): Promise<boolean> {
    return await this.setTriggerEnabled(triggerId, false);
  }

  /**
   * Set trigger enabled state
   * @param triggerId - Trigger ID
   * @param enabled - Enabled state
   * @returns Promise resolving to success status
   */
  private async setTriggerEnabled(triggerId: string, enabled: boolean): Promise<boolean> {
    try {
      for (const eventType in this.triggers) {
        const trigger = this.triggers[eventType].find(t => t.id === triggerId);
        if (trigger) {
          trigger.enabled = enabled;
          await this.saveTriggers();
          this.log('info', `Trigger ${triggerId} ${enabled ? 'enabled' : 'disabled'}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      this.handleError('setTriggerEnabled', error);
    }
  }

  /**
   * Emit an event and execute all registered triggers
   * @param eventName - Event type
   * @param data - Event data to pass to scripts
   * @returns Promise resolving to execution results
   */
  public async emitEvent(eventName: string, data: EventData = {}): Promise<ExecutionResult[]> {
    try {
      const eventTriggers = await this.getTriggersForEvent(eventName);
      
      if (!eventTriggers || eventTriggers.length === 0) {
        this.log('debug', `No triggers registered for event: ${eventName}`);
        return [];
      }

      // Filter enabled triggers and sort by priority
      const enabledTriggers = eventTriggers
        .filter(t => t.enabled)
        .sort((a, b) => b.priority - a.priority);

      const results: ExecutionResult[] = [];

      // Execute each trigger
      for (const trigger of enabledTriggers) {
        const result = await this.executeTrigger(trigger, eventName, data);
        results.push(result);
      }

      return results;
    } catch (error) {
      this.handleError('emit', error);
    }
  }

  /**
   * Execute a single trigger
   * @param trigger - Trigger to execute
   * @param eventType - Event type
   * @param eventData - Event data
   * @returns Execution result
   */
  private async executeTrigger(
    trigger: Trigger,
    eventType: string,
    eventData: EventData
  ): Promise<ExecutionResult> {
    try {
      // Check condition if specified
      if (trigger.condition) {
        try {
          const conditionMet = new Function('eventData', `return ${trigger.condition}`)(eventData);
          if (!conditionMet) {
            this.log('debug', `Condition not met for trigger ${trigger.id}`);
            return {
              triggerId: trigger.id,
              scriptId: trigger.scriptId,
              success: true,
              result: 'skipped'
            };
          }
        } catch (error) {
          this.log('error', `Condition evaluation failed for trigger ${trigger.id}:`, error);
          return {
            triggerId: trigger.id,
            scriptId: trigger.scriptId,
            success: false,
            error: 'Condition evaluation failed'
          };
        }
      }

      // Create harmony API with event context
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const scriptingApiModule = require('./scripting-api');
      const harmonyAPI = scriptingApiModule.createHarmonyAPI();
      
      // Add event data to API
      harmonyAPI.event = {
        type: eventType,
        data: eventData,
        timestamp: Date.now()
      };

      // Execute script
      this.log('info', `Executing trigger: ${trigger.id} for event: ${eventType}`);
      const scriptService = await this.getScriptService();
      const result = await scriptService.executeScript(trigger.scriptId, harmonyAPI);

      // Update trigger stats
      trigger.lastExecuted = new Date().toISOString();
      trigger.executionCount++;
      await this.saveTriggers();

      return {
        triggerId: trigger.id,
        scriptId: trigger.scriptId,
        success: true,
        result: result
      };

    } catch (error) {
      this.log('error', `Trigger execution failed for ${trigger.id}:`, error);
      return {
        triggerId: trigger.id,
        scriptId: trigger.scriptId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test a trigger by manually executing it
   * @param triggerId - Trigger ID
   * @param testData - Test event data
   * @returns Promise resolving to execution result
   */
  public async testTrigger(triggerId: string, testData: EventData = {}): Promise<TestResult> {
    try {
      // Find trigger
      let trigger: Trigger | null = null;
      let eventType: string | null = null;

      for (const type in this.triggers) {
        const found = this.triggers[type].find(t => t.id === triggerId);
        if (found) {
          trigger = found;
          eventType = type;
          break;
        }
      }

      if (!trigger || !eventType) {
        throw new Error(`Trigger not found: ${triggerId}`);
      }

      // Execute with test data
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const scriptingApiModule = require('./scripting-api');
      const harmonyAPI = scriptingApiModule.createHarmonyAPI();
      
      harmonyAPI.event = {
        type: eventType,
        data: testData,
        timestamp: Date.now(),
        isTest: true
      };

      const scriptService = await this.getScriptService();
      const result = await scriptService.executeScript(trigger.scriptId, harmonyAPI);

      return {
        success: true,
        result: result,
        trigger: trigger
      };
    } catch (error) {
      this.handleError('testTrigger', error);
    }
  }

  /**
   * Get available event types
   * @returns List of event types as a Promise
   */
  public async list(): Promise<string[]> {
    return Object.values(EventType);
  }

  /**
   * Delete all triggers for a script
   * @param scriptId - Script ID
   * @returns Promise resolving to number of triggers deleted
   */
  public async deleteTriggersForScript(scriptId: string): Promise<number> {
    try {
      let count = 0;

      for (const eventType in this.triggers) {
        const initialLength = this.triggers[eventType].length;
        this.triggers[eventType] = this.triggers[eventType].filter(t => t.scriptId !== scriptId);
        count += initialLength - this.triggers[eventType].length;
      }

      if (count > 0) {
        await this.saveTriggers();
        this.log('info', `Deleted ${count} triggers for script ${scriptId}`);
      }

      return count;
    } catch (error) {
      this.handleError('deleteTriggersForScript', error);
    }
  }

  /**
   * Emit event and trigger scripts
   * This method provides IEventTriggerService-compatible functionality
   * @param eventName - Event name
   * @param data - Event data
   */
  public async emitTrigger(eventName: string, data?: any): Promise<void> {
    await this.emitEvent(eventName, data || {});
  }

  /**
   * Register event handler (for compatibility)
   * @param eventName - Event name
   * @param handler - Event handler function
   */
  public register(eventName: string, handler: (data: any) => void): void {
    this.on(eventName, handler);
    this.log('debug', `Registered handler for event: ${eventName}`);
  }

  /**
   * Unregister event handler (for compatibility)
   * @param eventName - Event name
   */
  public unregister(eventName: string): void {
    this.removeAllListeners(eventName);
    this.log('debug', `Unregistered handlers for event: ${eventName}`);
  }

  // ==================== Utility Methods ====================

  /**
   * Check if event type is valid
   * @param eventType - Event type to validate
   * @returns True if valid, false otherwise
   */
  private isValidEventType(eventType: string): boolean {
    return Object.values(EventType).includes(eventType as EventType);
  }
}

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
