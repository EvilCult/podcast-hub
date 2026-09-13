import { fetchAll, getById, insert, updateById, rmById } from '$lib/server/db';

const TABLE = 'episodes';

export type Episode = {
    id: number;
    title: string;
    url: string | null;
    radio_id: number;
    pub_date: number | null;
    is_del: number;
};

export function getEpisodeById(id: number): Episode | undefined {
    return getById<Episode>(TABLE, id);
}

export function getEpisodes(): Episode[] {
    return fetchAll<Episode>(TABLE, 'is_del = 0');
}

export function createEpisode(data: {
    title: string;
    url: string | null;
    radio_id: number;
    pub_date: number | null;
}): number {
    return insert(TABLE, {
        ...data,
        is_del: 0
    });
}

export function updateEpisode(id: number, data: Partial<Omit<Episode, 'id'>>): boolean {
    return updateById(TABLE, id, data);
}

export function deleteEpisode(id: number): boolean {
    return rmById(TABLE, id);
}
