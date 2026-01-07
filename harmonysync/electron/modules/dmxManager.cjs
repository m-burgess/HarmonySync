const { getDatabase } = require('./databaseManager.cjs');

/**
 * DMX Manager Module
 * Handles DMX lighting control operations
 */

/**
 * Get all DMX fixtures
 * @returns {Promise<Array>} List of fixtures
 */
async function getFixtures() {
  try {
    const db = getDatabase();
    const fixtures = db.prepare('SELECT * FROM dmx_fixtures ORDER BY channel').all();
    
    return {
      success: true,
      fixtures: fixtures.map(f => ({
        ...f,
        properties: JSON.parse(f.properties || '{}')
      }))
    };
  } catch (error) {
    console.error('Error getting DMX fixtures:', error);
    throw error;
  }
}

/**
 * Add a new DMX fixture
 * @param {object} fixture - Fixture data
 * @returns {Promise<object>} Created fixture
 */
async function addFixture(fixture) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO dmx_fixtures (name, type, channel, universe, properties)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      fixture.name,
      fixture.type,
      fixture.channel,
      fixture.universe || 1,
      JSON.stringify(fixture.properties || {})
    );
    
    return {
      success: true,
      fixture: {
        id: result.lastInsertRowid,
        ...fixture
      }
    };
  } catch (error) {
    console.error('Error adding DMX fixture:', error);
    throw error;
  }
}

/**
 * Update a DMX fixture
 * @param {object} fixture - Fixture data with id
 * @returns {Promise<object>} Updated fixture
 */
async function updateFixture(fixture) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE dmx_fixtures
      SET name = ?, type = ?, channel = ?, universe = ?, properties = ?
      WHERE id = ?
    `);
    
    stmt.run(
      fixture.name,
      fixture.type,
      fixture.channel,
      fixture.universe || 1,
      JSON.stringify(fixture.properties || {}),
      fixture.id
    );
    
    return {
      success: true,
      fixture: fixture
    };
  } catch (error) {
    console.error('Error updating DMX fixture:', error);
    throw error;
  }
}

/**
 * Delete a DMX fixture
 * @param {number} fixtureId - Fixture ID
 * @returns {Promise<object>} Delete result
 */
async function deleteFixture(fixtureId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM dmx_fixtures WHERE id = ?');
    stmt.run(fixtureId);
    
    return {
      success: true,
      message: 'Fixture deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting DMX fixture:', error);
    throw error;
  }
}

/**
 * Get all DMX scenes
 * @returns {Promise<Array>} List of scenes
 */
async function getScenes() {
  try {
    const db = getDatabase();
    const scenes = db.prepare('SELECT * FROM dmx_scenes ORDER BY name').all();
    
    return {
      success: true,
      scenes: scenes.map(s => ({
        ...s,
        fixture_states: JSON.parse(s.fixture_states || '{}')
      }))
    };
  } catch (error) {
    console.error('Error getting DMX scenes:', error);
    throw error;
  }
}

/**
 * Create a new DMX scene
 * @param {object} scene - Scene data
 * @returns {Promise<object>} Created scene
 */
async function createScene(scene) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO dmx_scenes (name, description, fixture_states)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(
      scene.name,
      scene.description || '',
      JSON.stringify(scene.fixture_states || {})
    );
    
    return {
      success: true,
      scene: {
        id: result.lastInsertRowid,
        ...scene
      }
    };
  } catch (error) {
    console.error('Error creating DMX scene:', error);
    throw error;
  }
}

/**
 * Update a DMX scene
 * @param {object} scene - Scene data with id
 * @returns {Promise<object>} Updated scene
 */
async function updateScene(scene) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE dmx_scenes
      SET name = ?, description = ?, fixture_states = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      scene.name,
      scene.description || '',
      JSON.stringify(scene.fixture_states || {}),
      scene.id
    );
    
    return {
      success: true,
      scene: scene
    };
  } catch (error) {
    console.error('Error updating DMX scene:', error);
    throw error;
  }
}

/**
 * Delete a DMX scene
 * @param {number} sceneId - Scene ID
 * @returns {Promise<object>} Delete result
 */
async function deleteScene(sceneId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM dmx_scenes WHERE id = ?');
    stmt.run(sceneId);
    
    return {
      success: true,
      message: 'Scene deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting DMX scene:', error);
    throw error;
  }
}

/**
 * Recall a DMX scene (apply fixture states)
 * @param {number} sceneId - Scene ID
 * @returns {Promise<object>} Recall result
 */
async function recallScene(sceneId) {
  try {
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM dmx_scenes WHERE id = ?').get(sceneId);
    
    if (!scene) {
      throw new Error('Scene not found');
    }

    const fixtureStates = JSON.parse(scene.fixture_states || '{}');
    
    // TODO: Actually send DMX data to hardware
    // This would require DMX interface library (e.g., dmx, node-dmx)
    console.log('Recalling DMX scene:', scene.name, fixtureStates);
    
    return {
      success: true,
      scene_id: sceneId,
      message: 'Scene recalled successfully'
    };
  } catch (error) {
    console.error('Error recalling DMX scene:', error);
    throw error;
  }
}

module.exports = {
  getFixtures,
  addFixture,
  updateFixture,
  deleteFixture,
  getScenes,
  createScene,
  updateScene,
  deleteScene,
  recallScene
};
