/**
 * Event Trigger Service
 * Manages event-driven script execution
 * Allows scripts to automatically respond to application events
 */

const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const scriptService = require('./script-service');

// Event types that scripts can subscribe to
const EVENT_TYPES = {
  SLIDE_CHANGE: 'slideChange',
  SLIDE_LOAD: 'slideLoad',
  VIDEO_START: 'videoStart',
  VIDEO_END: 'videoEnd',
  VIDEO_PAUSE: 'videoPause',
  VIDEO_RESUME: 'videoResume',
  AUDIO_START: 'audioStart',
  AUDIO_END: 'audioEnd',
  AUDIO_PAUSE: 'audioPause',
  AUDIO_RESUME: 'audioResume',
  WINDOW_SHOW: 'windowShow',
  WINDOW_HIDE: 'windowHide',
  MACRO_EXECUTE: 'macroExecute',
  SCHEDULED_EVENT_START: 'scheduledEventStart',
  SCHEDULED_EVENT_END: 'scheduledEventEnd'
};

// Storage for event triggers
const TRIGGERS_FILE = path.join(app.getPath('userData'), 'event-triggers.json');

// In-memory trigger registry
let triggers = {};

/**
 * Initialize event trigger service
 */
async function initializeEventTriggers() {
  await loadTriggers();
  console.log('Event trigger service initialized');
}

/**
 * Load triggers from storage
 */
async function loadTriggers() {
  try {
    if (await fs.pathExists(TRIGGERS_FILE)) {
      const data = await fs.readJSON(TRIGGERS_FILE);
      triggers = data;
    } else {
      triggers = {};
    }
  } catch (error) {
    console.error('Failed to load event triggers:', error);
    triggers = {};
  }
}

/**
 * Save triggers to storage
 */
async function saveTriggers() {
  try {
    await fs.writeJSON(TRIGGERS_FILE, triggers, { spaces: 2 });
  } catch (error) {
    console.error('Failed to save event triggers:', error);
    throw error;
  }
}

/**
 * Register a script to an event
 * @param {string} eventType - Event type to subscribe to
 * @param {string} scriptId - Script ID to execute
 * @param {object} options - Trigger options
 * @returns {Promise<object>} Trigger configuration
 */
async function registerTrigger(eventType, scriptId, options = {}) {
  if (!EVENT_TYPES[eventType.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '')]) {
    throw new Error(`Invalid event type: ${eventType}`);
  }

  // Verify script exists
  const script = await scriptService.getScript(scriptId);
  if (!script) {
    throw new Error(`Script not found: ${scriptId}`);
  }

  // Create trigger ID
  const triggerId = `${eventType}_${scriptId}_${Date.now()}`;

  // Create trigger configuration
  const trigger = {
    id: triggerId,
    eventType,
    scriptId,
    scriptName: script.name,
    enabled: options.enabled !== false,
    priority: options.priority || 0,
    condition: options.condition || null, // Optional JS condition
    createdAt: new Date().toISOString(),
    lastExecuted: null,
    executionCount: 0
  };

  // Initialize event type array if needed
  if (!triggers[eventType]) {
    triggers[eventType] = [];
  }

  // Add trigger
  triggers[eventType].push(trigger);

  // Save to storage
  await saveTriggers();

  console.log(`Trigger registered: ${triggerId}`);
  return trigger;
}

/**
 * Unregister a trigger
 * @param {string} triggerId - Trigger ID to remove
 * @returns {Promise<boolean>} Success status
 */
async function unregisterTrigger(triggerId) {
  let found = false;

  // Find and remove trigger
  for (const eventType in triggers) {
    const index = triggers[eventType].findIndex(t => t.id === triggerId);
    if (index !== -1) {
      triggers[eventType].splice(index, 1);
      found = true;
      break;
    }
  }

  if (found) {
    await saveTriggers();
    console.log(`Trigger unregistered: ${triggerId}`);
  }

  return found;
}

/**
 * Get all triggers
 * @returns {Promise<object>} All triggers grouped by event type
 */
async function getAllTriggers() {
  return triggers;
}

/**
 * Get triggers for a specific event
 * @param {string} eventType - Event type
 * @returns {Promise<Array>} Triggers for the event
 */
async function getTriggersForEvent(eventType) {
  return triggers[eventType] || [];
}

/**
 * Enable a trigger
 * @param {string} triggerId - Trigger ID
 * @returns {Promise<boolean>} Success status
 */
async function enableTrigger(triggerId) {
  return await setTriggerEnabled(triggerId, true);
}

/**
 * Disable a trigger
 * @param {string} triggerId - Trigger ID
 * @returns {Promise<boolean>} Success status
 */
async function disableTrigger(triggerId) {
  return await setTriggerEnabled(triggerId, false);
}

/**
 * Set trigger enabled state
 * @param {string} triggerId - Trigger ID
 * @param {boolean} enabled - Enabled state
 * @returns {Promise<boolean>} Success status
 */
async function setTriggerEnabled(triggerId, enabled) {
  for (const eventType in triggers) {
    const trigger = triggers[eventType].find(t => t.id === triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      await saveTriggers();
      return true;
    }
  }
  return false;
}

/**
 * Emit an event and execute all registered triggers
 * @param {string} eventType - Event type
 * @param {object} eventData - Event data to pass to scripts
 * @returns {Promise<Array>} Execution results
 */
async function emitEvent(eventType, eventData = {}) {
  const eventTriggers = await getTriggersForEvent(eventType);
  
  if (!eventTriggers || eventTriggers.length === 0) {
    return [];
  }

  // Filter enabled triggers and sort by priority
  const enabledTriggers = eventTriggers
    .filter(t => t.enabled)
    .sort((a, b) => b.priority - a.priority);

  const results = [];

  // Execute each trigger
  for (const trigger of enabledTriggers) {
    try {
      // Check condition if specified
      if (trigger.condition) {
        try {
          const conditionMet = new Function('eventData', `return ${trigger.condition}`)(eventData);
          if (!conditionMet) {
            continue;
          }
        } catch (error) {
          console.error(`Condition evaluation failed for trigger ${trigger.id}:`, error);
          continue;
        }
      }

      // Create harmony API with event context
      const scriptingAPI = require('./scripting-api');
      const harmonyAPI = scriptingAPI.createHarmonyAPI();
      
      // Add event data to API
      harmonyAPI.event = {
        type: eventType,
        data: eventData,
        timestamp: Date.now()
      };

      // Execute script
      console.log(`Executing trigger: ${trigger.id} for event: ${eventType}`);
      const result = await scriptService.executeScript(trigger.scriptId, harmonyAPI);

      // Update trigger stats
      trigger.lastExecuted = new Date().toISOString();
      trigger.executionCount++;
      await saveTriggers();

      results.push({
        triggerId: trigger.id,
        scriptId: trigger.scriptId,
        success: true,
        result: result
      });

    } catch (error) {
      console.error(`Trigger execution failed for ${trigger.id}:`, error);
      results.push({
        triggerId: trigger.id,
        scriptId: trigger.scriptId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Test a trigger by manually executing it
 * @param {string} triggerId - Trigger ID
 * @param {object} testData - Test event data
 * @returns {Promise<object>} Execution result
 */
async function testTrigger(triggerId, testData = {}) {
  // Find trigger
  let trigger = null;
  let eventType = null;

  for (const type in triggers) {
    const found = triggers[type].find(t => t.id === triggerId);
    if (found) {
      trigger = found;
      eventType = type;
      break;
    }
  }

  if (!trigger) {
    throw new Error(`Trigger not found: ${triggerId}`);
  }

  // Execute with test data
  const scriptingAPI = require('./scripting-api');
  const harmonyAPI = scriptingAPI.createHarmonyAPI();
  
  harmonyAPI.event = {
    type: eventType,
    data: testData,
    timestamp: Date.now(),
    isTest: true
  };

  const result = await scriptService.executeScript(trigger.scriptId, harmonyAPI);

  return {
    success: true,
    result: result,
    trigger: trigger
  };
}

/**
 * Get available event types
 * @returns {Array} List of event types
 */
function getEventTypes() {
  return Object.values(EVENT_TYPES);
}

/**
 * Delete all triggers for a script
 * @param {string} scriptId - Script ID
 * @returns {Promise<number>} Number of triggers deleted
 */
async function deleteTriggersForScript(scriptId) {
  let count = 0;

  for (const eventType in triggers) {
    const initialLength = triggers[eventType].length;
    triggers[eventType] = triggers[eventType].filter(t => t.scriptId !== scriptId);
    count += initialLength - triggers[eventType].length;
  }

  if (count > 0) {
    await saveTriggers();
  }

  return count;
}

module.exports = {
  initializeEventTriggers,
  registerTrigger,
  unregisterTrigger,
  getAllTriggers,
  getTriggersForEvent,
  enableTrigger,
  disableTrigger,
  emitEvent,
  testTrigger,
  getEventTypes,
  deleteTriggersForScript,
  EVENT_TYPES
};
