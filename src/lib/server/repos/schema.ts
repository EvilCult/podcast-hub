// Single source of truth for the database schema.
// Used by db.ts (runtime ensure on startup) and scripts/init-db.mjs.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS radios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    cover TEXT,
    digest TEXT,
    feed TEXT,
    resource TEXT,
    last_update INTEGER,
    is_del INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    digest TEXT,
    url TEXT,
    radio_id INTEGER,
    duration INTEGER,
    pub_date INTEGER,
    is_del INTEGER
);
CREATE INDEX IF NOT EXISTS idx_episodes_radio_id ON episodes (radio_id);

CREATE TABLE IF NOT EXISTS histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eid INTEGER,
    pos INTEGER,
    uid INTEGER DEFAULT 0,
    play_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_histories_eid ON histories (eid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_histories_uid_eid ON histories (uid, eid);

CREATE TABLE IF NOT EXISTS fav (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eid INTEGER,
    uid INTEGER DEFAULT 0,
    created_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_uid_eid ON fav (uid, eid);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    tr_preset TEXT NOT NULL DEFAULT 'standard',
    created_at INTEGER NOT NULL
);
`;
