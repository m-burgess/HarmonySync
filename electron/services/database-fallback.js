// ⚠️  DEPRECATED MODULE - DO NOT USE
// 
// This file previously provided an in-memory fallback database when better-sqlite3
// native module compilation failed. 
//
// All database functionality has been migrated to json-storage.js which uses JSON files
// and works without requiring any native module compilation.
//
// If you encounter code importing from this file, update it to use:
//   const jsonStorage = require('./json-storage');



async function initialize() {
  throw new Error('database-fallback.js is deprecated. Use json-storage.js for all database operations');
}

function getConnection() {
  throw new Error('database-fallback.js is deprecated. Use json-storage.js for all database operations');
}

module.exports = {
  initialize,
  getConnection
};
