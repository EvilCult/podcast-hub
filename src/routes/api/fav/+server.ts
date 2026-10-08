import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getById } from '$lib/server/repos/db';
import { addFav, getFavEpisodes, removeFav } from '$lib/server/repos/fav';

async function parseEpisodeId(request: Request): Promise<number | undefined> {
    try {
        const data = await request.json();
        const id = Number(data?.episode);
        if (!Number.isInteger(id) || id <= 0) {
            return undefined;
        }
        return id;
    } catch {
        return undefined;
    }
}

// GET /api/fav?p=1&ps=10 -> paginated favorite episodes, newest first
export const GET: RequestHandler = async ({ url }) => {
    const page = Number(url.searchParams.get('p') ?? 1);
    const pageSize = Number(url.searchParams.get('ps') ?? 10);
    if (!Number.isInteger(page) || !Number.isInteger(pageSize) || page < 1 || pageSize < 1) {
        return json({ error: 'Invalid url params' }, { status: 400 });
    }
    const rows = getFavEpisodes(page, pageSize);
    return json({
        data: rows.map((row) => ({
            id: row.id,
            title: row.title,
            digest: row.digest,
            url: row.url ?? null,
            duration: row.duration,
            pub_date: row.pub_date,
            pos: row.pos,
            radio_id: row.radio_id,
            radio_title: row.radio_title,
            radio_cover: row.radio_cover,
            fav_time: row.fav_time,
            is_fav: true
        }))
    });
};

function invalidEpisode() {
    return json({ error: 'Invalid or missing episode id' }, { status: 400 });
}

// PUT /api/fav  { "episode": 123 }  -> add to favorites (idempotent)
export const PUT: RequestHandler = async ({ request }) => {
    const eid = await parseEpisodeId(request);
    if (eid === undefined) {
        return invalidEpisode();
    }
    if (!getById('episodes', eid)) {
        return json({ error: `Episode ${eid} not found` }, { status: 404 });
    }
    const added = addFav(eid);
    return json({ episode: eid, favorited: true, added });
};

// DELETE /api/fav  { "episode": 123 }  -> remove from favorites (idempotent)
export const DELETE: RequestHandler = async ({ request }) => {
    const eid = await parseEpisodeId(request);
    if (eid === undefined) {
        return invalidEpisode();
    }
    const removed = removeFav(eid);
    return json({ episode: eid, favorited: false, removed });
};
