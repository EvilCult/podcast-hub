import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getById } from '$lib/server/repos/db';
import { addFav, removeFav } from '$lib/server/repos/fav';

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
