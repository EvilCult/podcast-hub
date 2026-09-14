import { fetchAll, getById, insert, updateById, rmById } from '$lib/server/repos/db';
import type { Radio, RadioListItem } from '$lib/server/models/radio_model';

const TABLE = 'radios';

export function getRadioById(id: number): Radio | undefined {
    return getById<Radio>(TABLE, id);
}

export function getRadios(): RadioListItem[] {
    const rows = fetchAll<Radio>(TABLE, 'is_del = 0');
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        cover: row.cover,
        digest: row.digest,
        last_update: row.last_update
    }));
}

export function createRadio(data: {
    title: string;
    cover: string | null;
    digest: string | null;
    feed: string;
    resource: string | null;
    last_update: number;
}): number {
    return insert(TABLE, {
        ...data,
        is_del: 0
    });
}

export function updateRadio(id: number, data: Partial<Omit<Radio, 'id'>>): boolean {
    return updateById(TABLE, id, data);
}

export function deleteRadio(id: number): boolean {
    return rmById(TABLE, id);
}
