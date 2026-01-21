// ⚠️  DEPRECATED MODULE - DO NOT USE
// 
// This file previously contained SQLite database operations using better-sqlite3.
// All database functionality has been migrated to json-storage.js which uses JSON files
// for data persistence without requiring native module compilation.
//
// If you encounter code importing from this file, update it to use:
//   const jsonStorage = require('./json-storage');
//
// The jsonStorage module provides a compatible API:
//   - initialize() - Creates necessary JSON files
//   - query(sql) - Returns query results
//   - run(sql) - Executes update/insert/delete
//   - get(sql) - Returns single row
//   - all(sql) - Returns all rows
//   - getConnection() - Returns compatibility object

console.warn('⚠️  WARNING: database.js is DEPRECATED');
console.warn('    This SQLite database module is no longer maintained');
console.warn('    Use electron/services/json-storage.js instead');

async function initialize() {
  console.error('ERROR: database.js is deprecated. Use json-storage.js instead');
  throw new Error('database.js is deprecated. Use json-storage.js for all database operations');
}

function getConnection() {
  console.error('ERROR: database.js is deprecated. Use json-storage.js instead');
  throw new Error('database.js is deprecated. Use json-storage.js for all database operations');
}

module.exports = {
  initialize,
  getConnection,
  query: () => { throw new Error('database.js is deprecated'); },
  run: () => { throw new Error('database.js is deprecated'); },
  get: () => { throw new Error('database.js is deprecated'); },
  all: () => { throw new Error('database.js is deprecated'); },
  close: () => { throw new Error('database.js is deprecated'); }
};
