/**
 * Macro Service
 * Handles macro execution and management
 */

/**
 * Execute a macro action
 * @param {Object} appHandle - Electron app handle
 * @param {string} macroId - Macro ID
 * @param {string} macroAction - Macro action type
 * @param {Object} options - Optional parameters (e.g., midiNote)
 * @returns {Promise<void>}
 */
async function executeMacro(appHandle, macroId, macroAction, options = {}) {
  console.log(`Executing macro: ${macroId} (${macroAction})`);
  
  switch (macroAction) {
    case 'start_preservice_music':
      appHandle.emit('main', 'start-preservice-music', {});
      break;
      
    case 'stop_preservice_music':
      appHandle.emit('main', 'stop-preservice-music', {});
      break;
      
    case 'send_midi_note':
      if (!options.midiNote) {
        throw new Error('MIDI note value is required for send_midi_note action');
      }
      appHandle.emit('main', 'send-midi-note', {
        note: options.midiNote,
        velocity: options.velocity || 127,
        duration: options.duration || 100
      });
      break;
      
    case 'display_black_screen':
      appHandle.emit('audience', 'display-black-screen', {});
      break;
      
    case 'clear_displays':
      appHandle.emit('audience', 'clear-display', {});
      appHandle.emit('confidence', 'clear-display', {});
      appHandle.emit('lowerThirds', 'clear-display', {});
      break;
      
    default:
      throw new Error(`Unknown macro action: ${macroAction}`);
  }
}

/**
 * Get all macros from database
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of macros
 */
async function getAllMacros(db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, action FROM macros',
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
 * Get macro by ID
 * @param {Object} db - Database connection
 * @param {number} macroId - Macro ID
 * @returns {Promise<Object>} Macro object
 */
async function getMacroById(db, macroId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, action FROM macros WHERE id = ?',
      [macroId],
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
 * Create new macro
 * @param {Object} db - Database connection
 * @param {Object} macro - Macro object
 * @returns {Promise<number>} Inserted macro ID
 */
async function createMacro(db, macro) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO macros (name, action) VALUES (?, ?)');
    
    try {
      stmt.run(macro.name, macro.action, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
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
 * Update macro
 * @param {Object} db - Database connection
 * @param {Object} macro - Macro object with id
 * @returns {Promise<void>}
 */
async function updateMacro(db, macro) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE macros SET name = ?, action = ? WHERE id = ?',
      [macro.name, macro.action, macro.id],
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
 * Delete macro
 * @param {Object} db - Database connection
 * @param {number} macroId - Macro ID
 * @returns {Promise<void>}
 */
async function deleteMacro(db, macroId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM macros WHERE id = ?', [macroId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get macros for a specific slide
 * @param {Object} db - Database connection
 * @param {string} slideId - Slide ID
 * @returns {Promise<Array>} Array of macros
 */
async function getMacrosForSlide(db, slideId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT m.* FROM macros m 
       INNER JOIN slide_macros sm ON m.id = sm.macro_id 
       WHERE sm.slide_id = ?`,
      [slideId],
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
 * Add macro to slide
 * @param {Object} db - Database connection
 * @param {string} slideId - Slide ID
 * @param {number} macroId - Macro ID
 * @returns {Promise<void>}
 */
async function addMacroToSlide(db, slideId, macroId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO slide_macros (slide_id, macro_id) VALUES (?, ?)',
      [slideId, macroId],
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
 * Remove macro from slide
 * @param {Object} db - Database connection
 * @param {string} slideId - Slide ID
 * @param {number} macroId - Macro ID
 * @returns {Promise<void>}
 */
async function removeMacroFromSlide(db, slideId, macroId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM slide_macros WHERE slide_id = ? AND macro_id = ?',
      [slideId, macroId],
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
 * Validate macro data
 * @param {Object} macro - Macro object
 * @returns {Object} Validation result
 */
function validateMacro(macro) {
  const errors = [];
  
  if (!macro.name || typeof macro.name !== 'string') {
    errors.push('Macro name is required');
  }
  
  if (!macro.action || typeof macro.action !== 'string') {
    errors.push('Macro action is required');
  }
  
  const validActions = [
    'start_preservice_music',
    'stop_preservice_music',
    'send_midi_note',
    'display_black_screen',
    'clear_displays'
  ];
  
  if (macro.action && !validActions.includes(macro.action)) {
    errors.push(`Invalid macro action. Must be one of: ${validActions.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  executeMacro,
  getAllMacros,
  getMacroById,
  createMacro,
  updateMacro,
  deleteMacro,
  getMacrosForSlide,
  addMacroToSlide,
  removeMacroFromSlide,
  validateMacro
};
