import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeListByRadioId } from '$lib/server/repos/episode';
import { PUBLIC_HOST } from '$env/static/public';

export function GET({ params, url }: RequestEvent) {
    const radio_id = Number(params.id);
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 5);
    if (Number.isNaN(radio_id) || Number.isNaN(page) || Number.isNaN(pageSize)) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }

    // Device traffic is unauthenticated by design; it always reads the admin's (uid 1) data.
    const rows = getEpisodeListByRadioId(radio_id, page, pageSize, false, true, 1);
    if (!rows) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }

    return json(
        rows.map((row) => {
            return {
                id: row.id,
                title: row.title,
                url: row.url
                    ? `${PUBLIC_HOST}/flatapi/transcode?url=${encodeURIComponent(row.url)}`
                    : null,
                duration: row.duration,
                pos: row.pos
            };
        })
    );
}
