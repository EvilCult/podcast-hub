import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { SCHEMA_SQL } from './schema';
import { hashPassword } from '../auth';

const DB_PATH = path.resolve('data/database.db');

// Ensure the database exists with the full schema on startup.
// Idempotent: safe to run on every launch (dev, preview, node build, docker).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.exec(SCHEMA_SQL);

// Seed the default admin (id 1) on first run and attribute legacy
// single-user data (uid 0) to them. Idempotent.
(function ensureAdmin() {
    const hasUsers = db.prepare('SELECT 1 FROM users LIMIT 1').get() !== undefined;
    if (hasUsers) return;
    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO users (username, password_hash, tr_preset, created_at) VALUES (?, ?, ?, ?)').run(
        'admin',
        hashPassword('123456'),
        'standard',
        now
    );
    db.prepare('UPDATE histories SET uid = 1 WHERE uid = 0').run();
    db.prepare('UPDATE fav SET uid = 1 WHERE uid = 0').run();
    console.log('[db] seeded default admin user (id 1); migrated legacy uid=0 rows');
})();

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function fetchOne<T = Record<string, unknown>>(
    table: string,
    where: string,
    params: unknown[] = []
): T | undefined {
    const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`;

    return db.prepare(sql).get(...params) as T | undefined;
}

export function fetchAll<T = Record<string, unknown>>(
    table: string,
    where = '',
    params: unknown[] = []
): T[] {
    const sql = where ? `SELECT * FROM ${table} WHERE ${where}` : `SELECT * FROM ${table}`;

    return db.prepare(sql).all(...params) as T[];
}

export function fetchQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    return db.prepare(sql).all(...params) as T[];
}

export function execute(sql: string, params: unknown[] = []): number {
    const result = db.prepare(sql).run(...params);

    return result.changes;
}

export function getById<T = Record<string, unknown>>(
    table: string,
    itemId: number | string,
    idCol = 'id'
): T | undefined {
    return fetchOne<T>(table, `${idCol} = ?`, [itemId]);
}

export function insert(table: string, data: Record<string, unknown>): number {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
        .map(() => '?')
        .join(', ');

    const sql = `
		INSERT INTO ${table} (${columns})
		VALUES (${placeholders})
	`;

    const result = db.prepare(sql).run(...Object.values(data));

    return Number(result.lastInsertRowid);
}

export function updateById(
    table: string,
    itemId: number | string,
    data: Record<string, unknown>,
    idCol = 'id'
): boolean {
    if (Object.keys(data).length === 0) {
        return false;
    }

    const assignments = Object.keys(data)
        .map((column) => `${column} = ?`)
        .join(', ');

    const sql = `
		UPDATE ${table}
		SET ${assignments}
		WHERE ${idCol} = ?
	`;

    const result = db.prepare(sql).run(...Object.values(data), itemId);

    return result.changes > 0;
}

export function upsert(table: string, data: Record<string, unknown>, key: string[]): boolean {
    if (Object.keys(data).length === 0) {
        return false;
    }

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
        .map(() => '?')
        .join(', ');

    const insertSql = `
		INSERT INTO ${table} (${columns})
		VALUES (${placeholders})
	`;

    const assignments = Object.keys(data)
        .filter((column) => !key.includes(column))
        .map((column) => `${column} = excluded.${column}`)
        .join(', ');

    const updateSql = `
        ON CONFLICT (${key.join(', ')})
        DO UPDATE SET
		${assignments}
	`;

    const sql = insertSql + updateSql;

    const result = db.prepare(sql).run(...Object.values(data));

    return result.changes > 0;
}

export function deleteById(table: string, itemId: number | string, idCol = 'id'): boolean {
    const sql = `
		DELETE FROM ${table}
		WHERE ${idCol} = ?
	`;

    const result = db.prepare(sql).run(itemId);

    return result.changes > 0;
}

export function rmById(table: string, itemId: number | string, idCol = 'id'): boolean {
    return updateById(table, itemId, { is_del: 1 }, idCol);
}

export function exists(table: string, where: string, params: unknown[] = []): boolean {
    const sql = `
		SELECT 1
		FROM ${table}
		WHERE ${where}
		LIMIT 1
	`;

    return db.prepare(sql).get(...params) !== undefined;
}

export function count(table: string, where = '', params: unknown[] = []): number {
    const sql = where
        ? `SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`
        : `SELECT COUNT(*) AS count FROM ${table}`;

    const row = db.prepare(sql).get(...params) as { count: number };

    return row.count;
}

export default db;
