/**
 * Reset Database script for eShop SUT
 * Unlocks all accounts, resets login attempts, and restores standard default users matching README.
 */
const path = require('path');
const sqlite3 = require(path.join(__dirname, '../../../backend/node_modules/sqlite3')).verbose();

const dbPath = path.join(__dirname, '../../../backend/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[RESET_DB] Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // 1. Reset lockout counters and unlock all users
  db.run("UPDATE users SET login_attempts = 0, locked_until = NULL", function (err) {
    if (err) {
      console.error('[RESET_DB] Error resetting lockout status:', err.message);
    } else {
      console.log(`[RESET_DB] Unlocked ${this.changes} existing accounts.`);
    }
  });

  // 2. Ensure standard accounts from README are intact with proper credentials
  const stmt = db.prepare(`
    UPDATE users SET password = ?, login_attempts = 0, locked_until = NULL WHERE email = ?
  `);

  stmt.run('Admin123!', 'admin@eshop.com');
  stmt.run('Test1234!', 'test@eshop.com');
  stmt.finalize(() => {
    console.log('[RESET_DB] Standard accounts from README (admin@eshop.com, test@eshop.com) verified.');
    db.close();
  });
});
