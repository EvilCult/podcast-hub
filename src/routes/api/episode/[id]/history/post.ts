import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateHistory } from '$lib/server/repos/history';

export const post: RequestHandler = async ({ params, request, locals }) => {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }

    const data = await request.json();
    const position = data.pos as number;

    const rst = updateHistory({
        eid: id,
        pos: position,
        play_time: Math.floor(Date.now() / 1000),
        uid: locals.user.id
    });

    return json({
        rst
    });
};
