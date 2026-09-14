import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = path.resolve('data/database.db');

const db = new Database(DB_PATH);

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
