/**
 * Reset Database script for eShop SUT
 * Resets user login attempts, clears lockouts, and ensures standard test accounts exist.
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
      console.log(`[RESET_DB] Successfully unlocked ${this.changes} user accounts.`);
    }
  });

  // 2. Ensure test accounts exist for data-driven testing
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password, role, login_attempts, locked_until)
    VALUES (?, ?, ?, ?, ?, 0, NULL)
  `);

  const testUsers = [
    [1, 'Admin User', 'admin@eshop.com', 'Admin123!', 'admin'],
    [2, 'Test User', 'test@eshop.com', 'Test1234!', 'user'],
    [3, 'Performance User 1', 'perf1@eshop.com', 'Perf1234!', 'user'],
    [4, 'Performance User 2', 'perf2@eshop.com', 'Perf1234!', 'user'],
    [5, 'Performance User 3', 'perf3@eshop.com', 'Perf1234!', 'user'],
    [6, 'Lockout Target User', 'lockout@eshop.com', 'Secret123!', 'user']
  ];

  testUsers.forEach(u => stmt.run(u));
  stmt.finalize(() => {
    console.log('[RESET_DB] Standard performance test accounts verified/seeded.');
    db.close();
  });
});
