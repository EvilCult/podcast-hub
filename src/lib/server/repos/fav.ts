import { execute, fetchOne, fetchQuery } from '$lib/server/repos/db';
import type { EpisodeData, EpisodeItem } from '$lib/server/models/episode_model';

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

export type FavEpisodeItem = EpisodeItem & {
    radio_id: number;
    radio_title: string;
    fav_time: number;
};

/** Favorite episodes with details, newest first. */
export function getFavEpisodes(page: number, pageSize: number, uid = 0): FavEpisodeItem[] {
    const offset = (page - 1) * pageSize;
    const sql = `
        SELECT episodes.*, histories.pos, histories.play_time,
               radios.title AS radio_title, fav.created_at AS fav_time
        FROM fav
        JOIN episodes ON episodes.id = fav.eid
        JOIN radios ON radios.id = episodes.radio_id
        LEFT JOIN histories ON histories.eid = episodes.id AND histories.uid = fav.uid
        WHERE fav.uid = ? AND episodes.is_del = 0
        ORDER BY fav.created_at DESC
        LIMIT ?, ?`;
    const rows = fetchQuery<EpisodeData & { radio_title: string; fav_time: number }>(sql, [
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
        is_fav: true,
        radio_id: row.radio_id,
        radio_title: row.radio_title,
        fav_time: row.fav_time
    }));
}
