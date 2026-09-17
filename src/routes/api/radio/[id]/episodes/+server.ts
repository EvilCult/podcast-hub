import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeByRadioId } from '$lib/server/repos/episode';

export function GET({ params }: RequestEvent) {
    const radio_id = Number(params.id);
    if (Number.isNaN(radio_id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const rows = getEpisodeByRadioId(radio_id);
    if (!rows) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }
    const eps = rows.map((row) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url,
        duration: row.duration,
        pub_date: row.pub_date
    }));
    return json({
        data: eps
    });
}
