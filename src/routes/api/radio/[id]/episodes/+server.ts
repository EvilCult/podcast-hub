import { PUBLIC_API_URL } from '$env/static/public';
import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeListByRadioId } from '$lib/server/repos/episode';

export function GET({ params, url }: RequestEvent) {
    const radio_id = Number(params.id);
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 10);
    if (Number.isNaN(radio_id) || Number.isNaN(page) || Number.isNaN(pageSize)) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }

    const rows = getEpisodeListByRadioId(radio_id, page, pageSize);
    if (!rows) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }
    const eps = rows.map((row) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url ? `${PUBLIC_API_URL}/api/audio?url=${encodeURIComponent(row.url)}` : null,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos
    }));
    return json({
        data: eps
    });
}
