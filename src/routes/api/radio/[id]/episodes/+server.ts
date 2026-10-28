import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeListByRadioId } from '$lib/server/repos/episode';

export function GET({ params, url, locals }: RequestEvent) {
    const radio_id = Number(params.id);
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 10);
    const order = url.searchParams.get('order') ?? 'desc';
    const hidePlayed = url.searchParams.get('hide_played') === '1';
    if (Number.isNaN(radio_id) || Number.isNaN(page) || Number.isNaN(pageSize)) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }
    if (order !== 'asc' && order !== 'desc') {
        return json({ error: 'Invalid order param' }, { status: 400 });
    }

    const rows = getEpisodeListByRadioId(
        radio_id,
        page,
        pageSize,
        order !== 'asc',
        hidePlayed,
        locals.user?.id ?? 0
    );
    if (!rows) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }
    const eps = rows.map((row) => ({
        id: row.id,
        title: row.title,
        digest: row.digest,
        url: row.url ?? null,
        duration: row.duration,
        pub_date: row.pub_date,
        pos: row.pos,
        is_fav: row.is_fav
    }));
    return json({
        data: eps
    });
}
