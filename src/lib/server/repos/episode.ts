import { fetchQuery, insert, updateById, deleteById } from '$lib/server/repos/db';
import type { EpisodeData, EpisodeItem, EpisodeCreate } from '$lib/server/models/episode_model';

const TABLE = 'episodes';
const HISTORY_TABLE = 'histories';
const FAV_TABLE = 'fav';

export function getEpisodeByRadioId(radio_id: number, uid = 0): EpisodeItem[] | undefined {
    const sql = `SELECT ${TABLE}.*, ${HISTORY_TABLE}.pos, ${HISTORY_TABLE}.play_time, ${FAV_TABLE}.eid AS fav_eid FROM ${TABLE} LEFT JOIN ${HISTORY_TABLE} ON ${TABLE}.id = ${HISTORY_TABLE}.eid AND ${HISTORY_TABLE}.uid = ? LEFT JOIN ${FAV_TABLE} ON ${FAV_TABLE}.eid = ${TABLE}.id AND ${FAV_TABLE}.uid = ? WHERE radio_id = ? AND is_del = 0`;
    const rows = fetchQuery<EpisodeData & { fav_eid: number | null }>(sql, [uid, uid, radio_id]);
    return rows.map((row: EpisodeData & { fav_eid: number | null }) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        play_time: row.play_time,
        is_fav: row.fav_eid != null
    }));
}

export function getEpisodeListByRadioId(
    radio_id: number,
    page: number,
    pageSize: number,
    is_desc: boolean = true,
    new_ep: boolean = false,
    uid = 0
): EpisodeItem[] | undefined {
    const offset = (page - 1) * pageSize;
    const desc = is_desc ? 'DESC' : 'ASC';
    const epFilter = new_ep ? ' AND (duration - pos > 180 OR pos IS NULL)' : '';
    const sql = `SELECT ${TABLE}.*, ${HISTORY_TABLE}.pos, ${HISTORY_TABLE}.play_time, ${FAV_TABLE}.eid AS fav_eid FROM ${TABLE} LEFT JOIN ${HISTORY_TABLE} ON ${TABLE}.id = ${HISTORY_TABLE}.eid AND ${HISTORY_TABLE}.uid = ? LEFT JOIN ${FAV_TABLE} ON ${FAV_TABLE}.eid = ${TABLE}.id AND ${FAV_TABLE}.uid = ? WHERE radio_id = ? AND is_del = 0 ${epFilter} ORDER BY pub_date ${desc} LIMIT ?, ?`;
    const rows = fetchQuery<EpisodeData & { fav_eid: number | null }>(sql, [
        uid,
        uid,
        radio_id,
        offset,
        pageSize
    ]);
    return rows.map((row: EpisodeData & { fav_eid: number | null }) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        play_time: row.play_time,
        is_fav: row.fav_eid != null
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
    return deleteById(TABLE, id);
}

export function deleteEpisodeByRadioId(radio_id: number): boolean {
    return deleteById(TABLE, radio_id, 'radio_id');
}

/**
 * Existing episode identity keys for a radio, for refresh dedup.
 * An episode is considered already stored when its enclosure URL matches,
 * or (when the URL is missing) when title + pub_date match.
 */
export function getEpisodeKeys(
    radio_id: number
): { url: string | null; title: string; pub_date: number | null }[] {
    return fetchQuery<{ url: string | null; title: string; pub_date: number | null }>(
        `SELECT url, title, pub_date FROM ${TABLE} WHERE radio_id = ? AND is_del = 0`,
        [radio_id]
    );
}
