import { execute, fetchOne } from '$lib/server/repos/db';

const TABLE = 'fav';

export function isFav(eid: number, uid = 0): boolean {
    return fetchOne(TABLE, 'eid = ? AND uid = ?', [eid, uid]) !== undefined;
}

/** Add a favorite. Idempotent: returns true only when newly added. */
export function addFav(eid: number, uid = 0): boolean {
    const changes = execute(
        `INSERT OR IGNORE INTO ${TABLE} (eid, uid, created_at) VALUES (?, ?, ?)`,
        [eid, uid, Math.floor(Date.now() / 1000)]
    );
    return changes > 0;
}

/** Remove a favorite. Idempotent: returns true only when one was removed. */
export function removeFav(eid: number, uid = 0): boolean {
    const changes = execute(`DELETE FROM ${TABLE} WHERE eid = ? AND uid = ?`, [eid, uid]);
    return changes > 0;
}
