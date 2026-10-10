import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getUserById, isAdmin } from '$lib/server/repos/user';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }
    const user = getUserById(locals.user.id);
    if (!user) {
        return json({ error: 'User not found' }, { status: 401 });
    }
    return json({
        id: user.id,
        username: user.username,
        isAdmin: isAdmin(user.id),
        tr_preset: user.tr_preset
    });
};
