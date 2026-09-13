import { fetchAll, getById, insert, updateById, rmById } from '$lib/server/db';

const TABLE = 'radios';

export type Radio = {
    id: number;
    title: string;
    cover: string | null;
    digest: string | null;
    feed: string;
    resource: string | null;
    last_update: number | null;
    is_del: number;
};

export function getRadioById(id: number): Radio | undefined {
    return getById<Radio>(TABLE, id);
}

export function getRadios(): Radio[] {
    return fetchAll<Radio>(TABLE, 'is_del = 0');
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
