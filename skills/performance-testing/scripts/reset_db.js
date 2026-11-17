/**
 * Reset Database script for eShop SUT
 * Resets user login attempts, clears lockouts, and seeds all performance test accounts from CSV files.
 */
const path = require('path');
const fs = require('fs');
const sqlite3 = require(path.join(__dirname, '../../../backend/node_modules/sqlite3')).verbose();

const dbPath = path.join(__dirname, '../../../backend/database.sqlite');
const dataDir = path.join(__dirname, '../../../performance-tests/data');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[RESET_DB] Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
});

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]; });
    return obj;
  });
}

db.serialize(() => {
  // 1. Reset lockout counters and unlock all users
  db.run("UPDATE users SET login_attempts = 0, locked_until = NULL", function (err) {
    if (err) {
      console.error('[RESET_DB] Error resetting lockout status:', err.message);
    } else {
      console.log(`[RESET_DB] Unlocked ${this.changes} existing accounts.`);
    }
  });

  const checkStmt = db.prepare("SELECT id FROM users WHERE email = ?");
  const updateStmt = db.prepare("UPDATE users SET name = ?, password = ?, role = ?, login_attempts = 0, locked_until = NULL WHERE email = ?");
  const insertStmt = db.prepare("INSERT INTO users (name, email, password, role, login_attempts, locked_until) VALUES (?, ?, ?, ?, 0, NULL)");

  function upsertUser(name, email, password, role) {
    checkStmt.get(email, (err, row) => {
      if (err) return;
      if (row) {
        updateStmt.run(name, password, role, email);
      } else {
        insertStmt.run(name, email, password, role);
      }
    });
  }

  // 2. Seed standard users from users.csv
  const usersCsvPath = path.join(dataDir, 'users.csv');
  if (fs.existsSync(usersCsvPath)) {
    const users = parseCsv(usersCsvPath);
    users.forEach(u => {
      upsertUser(u.name || 'Test User', u.email, u.password, u.role || 'user');
    });
    console.log(`[RESET_DB] Upserting ${users.length} accounts from users.csv`);
  }

  // 3. Seed lockout test users from lockout_accounts.csv
  const lockoutCsvPath = path.join(dataDir, 'lockout_accounts.csv');
  if (fs.existsSync(lockoutCsvPath)) {
    const lockoutUsers = parseCsv(lockoutCsvPath);
    lockoutUsers.forEach((u, idx) => {
      upsertUser(`Lockout User ${idx + 1}`, u.email, u.valid_password, 'user');
    });
    console.log(`[RESET_DB] Upserting ${lockoutUsers.length} accounts from lockout_accounts.csv`);
  }

  // Final check after waiting for statements
  setTimeout(() => {
    checkStmt.finalize();
    updateStmt.finalize();
    insertStmt.finalize();
    db.get("SELECT COUNT(*) AS total FROM users", (err, row) => {
      if (!err) {
        console.log(`[RESET_DB] Verification complete: Database currently has ${row.total} users.`);
      }
      db.close();
    });
  }, 500);
});
