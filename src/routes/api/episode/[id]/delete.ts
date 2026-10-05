import { type RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { updateEpisode } from '$lib/server/repos/episode';

// DELETE /api/episode/[id] -> logical delete (is_del = 1)
export const del: RequestHandler = async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return json({ error: 'Invalid episode id' }, { status: 400 });
    }
    const deleted = updateEpisode(id, { is_del: 1 });
    return json({ id, deleted });
};
