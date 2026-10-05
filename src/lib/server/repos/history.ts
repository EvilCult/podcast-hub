import { upsert, fetchOne, fetchQuery } from '$lib/server/repos/db';
import type { EpisodeData, EpisodeItem, HistoryUpdate } from '$lib/server/models/episode_model';

const TABLE = 'histories';

export function updateHistory(data: HistoryUpdate): boolean {
    return upsert(
        TABLE,
        {
            ...data
        },
        ['eid', 'uid']
    );
}

export function getHistoryById(id: number) {
    return fetchOne(TABLE, `eid = ?`, [id]);
}

export type HistoryEpisodeItem = EpisodeItem & {
    radio_id: number;
    radio_title: string;
};

/** Episodes with listening history, most recently played first. */
export function getHistoryEpisodes(page: number, pageSize: number, uid = 0): HistoryEpisodeItem[] {
    const offset = (page - 1) * pageSize;
    const sql = `
        SELECT episodes.*, histories.pos, histories.play_time,
               radios.title AS radio_title, fav.eid AS fav_eid
        FROM histories
        JOIN episodes ON episodes.id = histories.eid
        JOIN radios ON radios.id = episodes.radio_id
        LEFT JOIN fav ON fav.eid = episodes.id AND fav.uid = histories.uid
        WHERE histories.uid = ? AND episodes.is_del = 0
        ORDER BY histories.play_time DESC
        LIMIT ?, ?`;
    const rows = fetchQuery<EpisodeData & { radio_title: string; fav_eid: number | null }>(sql, [
        uid,
        offset,
        pageSize
    ]);
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        play_time: row.play_time,
        is_fav: row.fav_eid != null,
        radio_id: row.radio_id,
        radio_title: row.radio_title
    }));
}
