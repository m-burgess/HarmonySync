const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs-extra');

/**
 * Database Manager Module
 * Handles SQLite database operations
 */

let db = null;
const DB_PATH = path.join(app.getPath('userData'), 'harmonysync.db');

/**
 * Initialize database and create tables
 */
function initialize() {
  try {
    // Ensure user data directory exists
    fs.ensureDirSync(path.dirname(DB_PATH));

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Create tables
    createTables();

    console.log('Database initialized at:', DB_PATH);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Create database tables
 */
function createTables() {
  // DMX Fixtures table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dmx_fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      channel INTEGER NOT NULL,
      universe INTEGER DEFAULT 1,
      properties TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DMX Scenes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dmx_scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      fixture_states TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Scheduler events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      schedule_days TEXT,
      enabled INTEGER DEFAULT 1,
      event_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get database instance
 * @returns {Database} Database instance
 */
function getDatabase() {
  if (!db) {
    initialize();
  }
  return db;
}

/**
 * Close database connection
 */
function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initialize,
  getDatabase,
  close
};
