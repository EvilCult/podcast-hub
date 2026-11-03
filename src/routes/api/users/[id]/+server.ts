import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { deleteUser, getUserById, isAdmin } from '$lib/server/repos/user';

// DELETE /api/users/[id] -> delete user + their history/fav (admin only)
export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user || !isAdmin(locals.user.id)) {
        return json({ error: 'Admin only' }, { status: 403 });
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return json({ error: 'Invalid user id' }, { status: 400 });
    }
    if (id === 1) {
        return json({ error: 'Cannot delete the admin' }, { status: 400 });
    }
    if (id === locals.user.id) {
        return json({ error: 'Cannot delete yourself' }, { status: 400 });
    }
    if (!getUserById(id)) {
        return json({ error: 'User not found' }, { status: 404 });
    }

    deleteUser(id);
    return json({ ok: true, id });
};
