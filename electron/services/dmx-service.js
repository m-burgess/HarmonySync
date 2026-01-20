/**
 * DMX/Lighting Service
 * Handles DMX fixture and scene management for lighting control
 */

/**
 * Get all DMX fixtures from database
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of fixtures
 */
async function getAllFixtures(db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, fixture_type, dmx_address, universe, channel_count, channel_definitions FROM dmx_fixtures',
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
 * Add DMX fixture to database
 * @param {Object} db - Database connection
 * @param {Object} fixture - Fixture object
 * @returns {Promise<number>} Inserted fixture ID
 */
async function addFixture(db, fixture) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO dmx_fixtures (id, name, fixture_type, dmx_address, universe, channel_count, channel_definitions) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    
    try {
      stmt.run(
        fixture.id,
        fixture.name,
        fixture.fixture_type,
        fixture.dmx_address,
        fixture.universe,
        fixture.channel_count,
        fixture.channel_definitions,
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
 * Update DMX fixture
 * @param {Object} db - Database connection
 * @param {Object} fixture - Fixture object
 * @returns {Promise<void>}
 */
async function updateFixture(db, fixture) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE dmx_fixtures SET name = ?, fixture_type = ?, dmx_address = ?, universe = ?, channel_count = ?, channel_definitions = ? WHERE id = ?',
      [fixture.name, fixture.fixture_type, fixture.dmx_address, fixture.universe, fixture.channel_count, fixture.channel_definitions, fixture.id],
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
 * Delete DMX fixture
 * @param {Object} db - Database connection
 * @param {string} fixtureId - Fixture ID
 * @returns {Promise<void>}
 */
async function deleteFixture(db, fixtureId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM dmx_fixtures WHERE id = ?', [fixtureId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get all DMX scenes from database
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of scenes
 */
async function getAllScenes(db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, description, fade_time_ms, scene_data FROM dmx_scenes',
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
 * Create DMX scene
 * @param {Object} db - Database connection
 * @param {Object} scene - Scene object
 * @returns {Promise<number>} Inserted scene ID
 */
async function createScene(db, scene) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO dmx_scenes (id, name, description, fade_time_ms, scene_data) VALUES (?, ?, ?, ?, ?)'
    );
    
    try {
      stmt.run(
        scene.id,
        scene.name,
        scene.description,
        scene.fade_time_ms,
        scene.scene_data,
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
 * Update DMX scene
 * @param {Object} db - Database connection
 * @param {Object} scene - Scene object
 * @returns {Promise<void>}
 */
async function updateScene(db, scene) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE dmx_scenes SET name = ?, description = ?, fade_time_ms = ?, scene_data = ? WHERE id = ?',
      [scene.name, scene.description, scene.fade_time_ms, scene.scene_data, scene.id],
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
 * Delete DMX scene
 * @param {Object} db - Database connection
 * @param {string} sceneId - Scene ID
 * @returns {Promise<void>}
 */
async function deleteScene(db, sceneId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM dmx_scenes WHERE id = ?', [sceneId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get scene by ID
 * @param {Object} db - Database connection
 * @param {string} sceneId - Scene ID
 * @returns {Promise<Object>} Scene object
 */
async function getSceneById(db, sceneId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, description, fade_time_ms, scene_data FROM dmx_scenes WHERE id = ?',
      [sceneId],
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
 * Recall/activate DMX scene
 * @param {Object} db - Database connection
 * @param {string} sceneId - Scene ID
 * @returns {Promise<Object>} Scene object that was recalled
 */
async function recallScene(db, sceneId) {
  const scene = await getSceneById(db, sceneId);
  
  if (!scene) {
    throw new Error(`Scene with ID ${sceneId} not found`);
  }
  
  // TODO: Implement actual DMX output here
  // For now, just log that we're recalling the scene
  console.log(`Recalling DMX scene: ${scene.name} (fade time: ${scene.fade_time_ms}ms)`);
  console.log(`Scene data: ${scene.scene_data}`);
  
  return scene;
}

/**
 * Parse scene data JSON
 * @param {string} sceneData - JSON string of scene data
 * @returns {Object} Parsed scene data
 */
function parseSceneData(sceneData) {
  try {
    return JSON.parse(sceneData);
  } catch (err) {
    console.error('Error parsing scene data:', err);
    return {};
  }
}

/**
 * Validate fixture data
 * @param {Object} fixture - Fixture object
 * @returns {Object} Validation result
 */
function validateFixture(fixture) {
  const errors = [];
  
  if (!fixture.name || typeof fixture.name !== 'string') {
    errors.push('Fixture name is required');
  }
  
  if (!fixture.fixture_type || typeof fixture.fixture_type !== 'string') {
    errors.push('Fixture type is required');
  }
  
  if (typeof fixture.dmx_address !== 'number' || fixture.dmx_address < 1 || fixture.dmx_address > 512) {
    errors.push('DMX address must be between 1 and 512');
  }
  
  if (typeof fixture.universe !== 'number' || fixture.universe < 0) {
    errors.push('Universe must be a non-negative number');
  }
  
  if (typeof fixture.channel_count !== 'number' || fixture.channel_count < 1) {
    errors.push('Channel count must be at least 1');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  getAllFixtures,
  addFixture,
  updateFixture,
  deleteFixture,
  getAllScenes,
  createScene,
  updateScene,
  deleteScene,
  getSceneById,
  recallScene,
  parseSceneData,
  validateFixture
};
