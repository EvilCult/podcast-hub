import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

import { getHistoryById } from '$lib/server/repos/history';

export const get: RequestHandler = async ({ params }) => {
    const id = Number(params.id);
    const row = getHistoryById(id);

    if (!row) {
        return json({ pos: 0 });
    }

    return json({
        pos: row.pos ?? 0
    });
};
