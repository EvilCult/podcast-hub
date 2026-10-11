import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateHistory } from '$lib/server/repos/history';

export const post: RequestHandler = async ({ params, request, locals }) => {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const data = await request.json();
    const position = data.pos as number;

    // Web users write their own history; unauthenticated device traffic
    // (whitelisted in hooks.server.ts) writes to the admin's (uid 1) history.
    const uid = locals.user?.id ?? 1;

    const rst = updateHistory({
        eid: id,
        pos: position,
        play_time: Math.floor(Date.now() / 1000),
        uid
    });

    return json({
        rst
    });
};
