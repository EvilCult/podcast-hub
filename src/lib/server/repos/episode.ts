import { fetchAll, getById, insert, updateById, rmById } from '$lib/server/repos/db';
import type { EpisodeData, EpisodeItem, EpisodeCreate } from '$lib/server/models/episode_model';

const TABLE = 'episodes';

export function getEpisodeById(id: number): EpisodeItem | undefined {
    const row = getById<EpisodeItem>(TABLE, id);

    if (!row) {
        return undefined;
    }

    return {
        id: row.id,
        title: row.title,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date
    };
}

export function getEpisodeByRadioId(radio_id: number): EpisodeItem[] | undefined {
    const rows = fetchAll<EpisodeData>(TABLE, 'radio_id = ? AND is_del = 0', [radio_id]);
    return rows.map((row: EpisodeItem) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date
    }));
}

export function getEpisodes(): EpisodeItem[] {
    const rows = fetchAll<EpisodeData>(TABLE, 'is_del = 0');
    return rows.map((row: EpisodeItem) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date
    }));
}

export function createEpisode(data: EpisodeCreate): number {
    return insert(TABLE, {
        ...data,
        is_del: 0
    });
}

export function updateEpisode(id: number, data: Partial<Omit<EpisodeData, 'id'>>): boolean {
    return updateById(TABLE, id, data);
}

export function deleteEpisode(id: number): boolean {
    return rmById(TABLE, id);
}
