import { fetchAll, getById, insert, updateById, rmById } from '$lib/server/repos/db';
import type { RadioData, RadioItem, RadioCreate } from '$lib/server/models/radio_model';

const TABLE = 'radios';

export function getRadioById(id: number): RadioItem | undefined {
    const row = getById<RadioData>(TABLE, id);

    if (!row) {
        return undefined;
    }

    return {
        id: row.id,
        title: row.title,
        cover: row.cover,
        digest: row.digest,
        last_update: row.last_update
    };
}

export function getRadios(): RadioItem[] {
    const rows = fetchAll<RadioData>(TABLE, 'is_del = 0');
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        cover: row.cover,
        digest: row.digest,
        last_update: row.last_update
    }));
}

export function createRadio(data: RadioCreate): number {
    return insert(TABLE, {
        ...data,
        is_del: 0
    });
}

export function updateRadio(id: number, data: Partial<Omit<RadioData, 'id'>>): boolean {
    return updateById(TABLE, id, data);
}

export function deleteRadio(id: number): boolean {
    return rmById(TABLE, id);
}
