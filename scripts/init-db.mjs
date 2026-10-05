#!/usr/bin/env node
// Idempotent database init: creates data/database.db with the full schema
// when missing (also repairs a db file that lacks tables).
// Runs automatically via `predev` / `prebuild`; can also be run manually:
//     npm run db:init
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

// Node 24 strips types on .ts imports, so we can share the single source
// of truth directly from the server code.
import { SCHEMA_SQL } from '../src/lib/server/repos/schema.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'data', 'database.db');

const isNew = !fs.existsSync(dbPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(SCHEMA_SQL);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.close();

console.log(isNew ? `created ${dbPath}` : `schema ensured at ${dbPath}`);
