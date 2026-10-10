import { deleteById, execute, exists, fetchAll, fetchOne, insert, updateById } from '$lib/server/repos/db';

const TABLE = 'users';

export interface UserRow {
    id: number;
    username: string;
    password_hash: string;
    tr_preset: string;
    created_at: number;
}

export function getUserById(id: number): UserRow | undefined {
    return fetchOne<UserRow>(TABLE, 'id = ?', [id]);
}

export function getUserByUsername(username: string): UserRow | undefined {
    return fetchOne<UserRow>(TABLE, 'username = ?', [username]);
}

export function listUsers(): Array<Pick<UserRow, 'id' | 'username' | 'tr_preset' | 'created_at'>> {
    return fetchAll<Pick<UserRow, 'id' | 'username' | 'tr_preset' | 'created_at'>>(
        TABLE,
        '1 = 1 ORDER BY id ASC'
    );
}

export function createUser(username: string, passwordHash: string): number {
    return insert(TABLE, {
        username,
        password_hash: passwordHash,
        tr_preset: 'standard',
        created_at: Math.floor(Date.now() / 1000)
    });
}

export function usernameTaken(username: string): boolean {
    return exists(TABLE, 'username = ?', [username]);
}

export function updateUserPassword(id: number, passwordHash: string): boolean {
    return updateById(TABLE, id, { password_hash: passwordHash });
}

export function updateUsername(id: number, username: string): boolean {
    return updateById(TABLE, id, { username });
}

export function updateUserPreset(id: number, preset: string): boolean {
    return updateById(TABLE, id, { tr_preset: preset });
}

/** Delete a user and all of their history/fav rows. Never deletes id 1. */
export function deleteUser(id: number): boolean {
    if (id === 1) return false;
    execute('DELETE FROM histories WHERE uid = ?', [id]);
    execute('DELETE FROM fav WHERE uid = ?', [id]);
    return deleteById(TABLE, id);
}

/** uid 1 is the administrator, by convention. */
export function isAdmin(id: number): boolean {
    return id === 1;
}
