import { json, type RequestEvent } from '@sveltejs/kit';

import { getFavEpisodes } from '$lib/server/repos/fav';
import { getHistoryEpisodes } from '$lib/server/repos/history';
import { deviceProfileQuery } from '$lib/server/transcode';
import { PUBLIC_API_URL } from '$env/static/public';

export function GET({ params, url }: RequestEvent) {
    const action = params.act;
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 5);
    if (action !== 'fav' && action !== 'history') {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }

    let rows;

    // Device traffic is unauthenticated by design; it always reads the
    // admin's (uid 1) data. flatapi never depends on the web app's auth.
    if (action == 'fav') {
        rows = getFavEpisodes(page, pageSize, 1);
    }

    if (action == 'history') {
        rows = getHistoryEpisodes(page, pageSize, 1);
    }

    if (!rows) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }

    return json(
        rows.map((row) => {
            return {
                id: row.id,
                title: row.title,
                url: row.url
                    ? `${PUBLIC_API_URL}/transcode?url=${encodeURIComponent(row.url)}&${deviceProfileQuery()}`
                    : null,
                duration: row.duration,
                pos: row.pos
            };
        })
    );
}
