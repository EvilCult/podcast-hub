import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeListByRadioId } from '$lib/server/repos/episode';
import { deviceProfileQuery } from '$lib/server/transcode';
import { PUBLIC_API_URL } from '$env/static/public';

export function GET({ params, url }: RequestEvent) {
    const radio_id = Number(params.id);
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 5);
    if (Number.isNaN(radio_id) || Number.isNaN(page) || Number.isNaN(pageSize)) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }

    const rows = getEpisodeListByRadioId(radio_id, page, pageSize, false, true);
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
