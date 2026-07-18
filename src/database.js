const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'puremc.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS links (
  discord_id   TEXT PRIMARY KEY,
  mc_uuid      TEXT NOT NULL,
  mc_username  TEXT NOT NULL,
  linked_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS link_codes (
  code         TEXT PRIMARY KEY,
  discord_id   TEXT NOT NULL,
  mc_username  TEXT NOT NULL,
  mc_uuid      TEXT NOT NULL,
  expires_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS warnings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id    TEXT NOT NULL,
  moderator_id  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  emoji         TEXT,
  description   TEXT,
  category_id   TEXT,
  staff_role_id TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  channel_id  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type_id     INTEGER,
  status      TEXT NOT NULL DEFAULT 'open',
  claimed_by  TEXT,
  created_at  INTEGER NOT NULL
);
`);

module.exports = db;
