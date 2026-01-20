/**
 * Scheduler Service
 * Handles scheduled event management and execution
 */

/**
 * Get all scheduled events from database
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of scheduled events
 */
async function getAllScheduledEvents(db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, event_time, event_type, target_id FROM schedule',
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get scheduled event by ID
 * @param {Object} db - Database connection
 * @param {number} eventId - Event ID
 * @returns {Promise<Object>} Scheduled event object
 */
async function getScheduledEventById(db, eventId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, event_time, event_type, target_id FROM schedule WHERE id = ?',
      [eventId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

/**
 * Create scheduled event
 * @param {Object} db - Database connection
 * @param {Object} event - Event object
 * @returns {Promise<number>} Inserted event ID
 */
async function createScheduledEvent(db, event) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO schedule (event_time, event_type, target_id) VALUES (?, ?, ?)'
    );
    
    try {
      stmt.run(
        event.event_time,
        event.event_type,
        event.target_id,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    } finally {
      try {
        stmt.finalize();
      } catch (finalizeErr) {
        console.error('Error finalizing statement:', finalizeErr);
      }
    }
  });
}

/**
 * Update scheduled event
 * @param {Object} db - Database connection
 * @param {Object} event - Event object with id
 * @returns {Promise<void>}
 */
async function updateScheduledEvent(db, event) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE schedule SET event_time = ?, event_type = ?, target_id = ? WHERE id = ?',
      [event.event_time, event.event_type, event.target_id, event.id],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Delete scheduled event
 * @param {Object} db - Database connection
 * @param {number} eventId - Event ID
 * @returns {Promise<void>}
 */
async function deleteScheduledEvent(db, eventId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM schedule WHERE id = ?', [eventId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get events scheduled for a specific time range
 * @param {Object} db - Database connection
 * @param {string} startTime - Start time (ISO string)
 * @param {string} endTime - End time (ISO string)
 * @returns {Promise<Array>} Array of scheduled events
 */
async function getEventsInTimeRange(db, startTime, endTime) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, event_time, event_type, target_id FROM schedule WHERE event_time >= ? AND event_time <= ?',
      [startTime, endTime],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get events scheduled for today
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of scheduled events
 */
async function getTodayEvents(db) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  return getEventsInTimeRange(db, startOfDay.toISOString(), endOfDay.toISOString());
}

/**
 * Get upcoming events
 * @param {Object} db - Database connection
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Promise<Array>} Array of upcoming events
 */
async function getUpcomingEvents(db, hours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + (hours * 60 * 60 * 1000));
  
  return getEventsInTimeRange(db, now.toISOString(), future.toISOString());
}

/**
 * Check if event should execute now
 * @param {Object} event - Event object
 * @param {number} toleranceMs - Tolerance in milliseconds (default: 60000)
 * @returns {boolean} Whether event should execute
 */
function shouldExecuteNow(event, toleranceMs = 60000) {
  const now = Date.now();
  const eventTime = new Date(event.event_time).getTime();
  const diff = Math.abs(now - eventTime);
  
  return diff <= toleranceMs && now >= eventTime;
}

/**
 * Parse event time string to Date
 * @param {string} timeString - Time string (ISO or HH:MM format)
 * @returns {Date} Parsed date
 */
function parseEventTime(timeString) {
  // Try ISO format first
  let date = new Date(timeString);
  
  if (isNaN(date.getTime())) {
    // Try HH:MM format
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const now = new Date();
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                     parseInt(match[1], 10), parseInt(match[2], 10));
    }
  }
  
  return date;
}

/**
 * Format event for display
 * @param {Object} event - Event object
 * @returns {Object} Formatted event
 */
function formatEventForDisplay(event) {
  const eventDate = new Date(event.event_time);
  
  return {
    ...event,
    formatted_time: eventDate.toLocaleTimeString(),
    formatted_date: eventDate.toLocaleDateString(),
    is_past: eventDate < new Date()
  };
}

/**
 * Validate scheduled event data
 * @param {Object} event - Event object
 * @returns {Object} Validation result
 */
function validateScheduledEvent(event) {
  const errors = [];
  
  if (!event.event_time) {
    errors.push('Event time is required');
  } else {
    const eventDate = parseEventTime(event.event_time);
    if (isNaN(eventDate.getTime())) {
      errors.push('Invalid event time format');
    }
  }
  
  if (!event.event_type || typeof event.event_type !== 'string') {
    errors.push('Event type is required');
  }
  
  if (!event.target_id || typeof event.target_id !== 'string') {
    errors.push('Target ID is required');
  }
  
  const validEventTypes = ['macro', 'presentation', 'media', 'custom'];
  if (event.event_type && !validEventTypes.includes(event.event_type)) {
    errors.push(`Invalid event type. Must be one of: ${validEventTypes.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  getAllScheduledEvents,
  getScheduledEventById,
  createScheduledEvent,
  updateScheduledEvent,
  deleteScheduledEvent,
  getEventsInTimeRange,
  getTodayEvents,
  getUpcomingEvents,
  shouldExecuteNow,
  parseEventTime,
  formatEventForDisplay,
  validateScheduledEvent
};
