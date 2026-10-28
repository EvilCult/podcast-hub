import { type RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { updateEpisode } from '$lib/server/repos/episode';

// DELETE /api/episode/[id] -> logical delete (is_del = 1, global for all users)
// Admin only (id = 1)
export const del: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }
    if (locals.user.id !== 1) {
        return json({ error: 'Admin only' }, { status: 403 });
    }
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return json({ error: 'Invalid episode id' }, { status: 400 });
    }
    const deleted = updateEpisode(id, { is_del: 1 });
    return json({ id, deleted });
};
