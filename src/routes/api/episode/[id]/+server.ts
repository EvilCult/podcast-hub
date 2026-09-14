import { json, type RequestEvent } from '@sveltejs/kit';

import { getEpisodeById } from '$lib/server/repos/episode';

export function GET({ params }: RequestEvent) {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const episode = getEpisodeById(id);
    if (!episode) {
        return json({ error: 'Episode not found' }, { status: 404 });
    }
    return json({
        data: episode
    });
}
