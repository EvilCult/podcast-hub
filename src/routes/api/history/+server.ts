import { json, type RequestEvent } from '@sveltejs/kit';

import { getHistoryEpisodes } from '$lib/server/repos/history';

// GET /api/history?p=1&ps=10 -> episodes with listening history,
// most recently played first
export function GET({ url }: RequestEvent) {
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 10);
    if (!Number.isInteger(page) || !Number.isInteger(pageSize) || page < 1 || pageSize < 1) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }

    const rows = getHistoryEpisodes(page, pageSize);
    return json({
        data: rows.map((row) => ({
            id: row.id,
            title: row.title,
            digest: row.digest,
            url: row.url ?? null,
            duration: row.duration,
            pub_date: row.pub_date,
            pos: row.pos,
            play_time: row.play_time,
            radio_id: row.radio_id,
            radio_title: row.radio_title,
            radio_cover: row.radio_cover,
            is_fav: row.is_fav
        }))
    });
}
