import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getUserById, updateUserPassword } from '$lib/server/repos/user';
import { hashPassword, verifyPassword } from '$lib/server/auth';

// POST /api/auth/password { oldPassword, newPassword } -> change own password
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }

    let body: { oldPassword?: unknown; newPassword?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!oldPassword || !newPassword) {
        return json({ error: 'Current and new passwords cannot be empty' }, { status: 400 });
    }
    if (newPassword.length < 4) {
        return json({ error: 'New password must be at least 4 characters' }, { status: 400 });
    }

    const user = getUserById(locals.user.id);
    if (!user || !verifyPassword(oldPassword, user.password_hash)) {
        return json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    updateUserPassword(user.id, hashPassword(newPassword));
    return json({ ok: true });
};
