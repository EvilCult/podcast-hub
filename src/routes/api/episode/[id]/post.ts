import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateHistory } from '$lib/server/repos/history';

export const post: RequestHandler = async ({ params, request }) => {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const data = await request.json();
    const position = data.pos as number;

    const rst = await updateHistory({
        eid: id,
        pos: position,
        play_time: Math.floor(Date.now() / 1000),
        uid: 0
    });

    return json({
        rst
    });
};
