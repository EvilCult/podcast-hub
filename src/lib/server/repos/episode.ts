import { fetchQuery, insert, updateById, rmById } from '$lib/server/repos/db';
import type { EpisodeData, EpisodeItem, EpisodeCreate } from '$lib/server/models/episode_model';

const TABLE = 'episodes';
const HISTORY_TABLE = 'histories';

export function getEpisodeByRadioId(radio_id: number): EpisodeItem[] | undefined {
    const sql = `SELECT ${TABLE}.*, ${HISTORY_TABLE}.pos, ${HISTORY_TABLE}.play_time FROM ${TABLE} LEFT JOIN ${HISTORY_TABLE} ON ${TABLE}.id = ${HISTORY_TABLE}.eid WHERE radio_id = ? AND is_del = 0`;
    const rows = fetchQuery<EpisodeData>(sql, [radio_id]);
    return rows.map((row: EpisodeItem) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        play_time: row.play_time
    }));
}

export function getEpisodeListByRadioId(
    radio_id: number,
    page: number,
    pageSize: number
): EpisodeItem[] | undefined {
    const offset = (page - 1) * pageSize;
    const sql = `SELECT ${TABLE}.*, ${HISTORY_TABLE}.pos, ${HISTORY_TABLE}.play_time FROM ${TABLE} LEFT JOIN ${HISTORY_TABLE} ON ${TABLE}.id = ${HISTORY_TABLE}.eid WHERE radio_id = ? AND is_del = 0 ORDER BY pub_date DESC LIMIT ?, ?`;
    const rows = fetchQuery<EpisodeData>(sql, [radio_id, offset, pageSize]);
    return rows.map((row: EpisodeItem) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        play_time: row.play_time
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
