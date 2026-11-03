import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getUserById, updateUsername, usernameTaken } from '$lib/server/repos/user';
import { sessionCookieHeader, signSession } from '$lib/server/auth';

// POST /api/auth/username { newUsername } -> change own username,
// re-issues the session cookie so the JWT claim stays in sync
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }

    let body: { newUsername?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const newUsername = typeof body.newUsername === 'string' ? body.newUsername.trim() : '';
    if (!newUsername) {
        return json({ error: 'Username cannot be empty' }, { status: 400 });
    }
    if (newUsername.length > 32) {
        return json({ error: 'Username is too long (max 32 characters)' }, { status: 400 });
    }

    const user = getUserById(locals.user.id);
    if (!user) {
        return json({ error: 'User not found' }, { status: 401 });
    }
    if (newUsername === user.username) {
        return json({ ok: true, username: user.username });
    }
    if (usernameTaken(newUsername)) {
        return json({ error: 'Username already exists' }, { status: 400 });
    }

    updateUsername(user.id, newUsername);
    const token = signSession({ uid: user.id, username: newUsername });
    return json(
        { ok: true, username: newUsername },
        { headers: { 'Set-Cookie': sessionCookieHeader(token) } }
    );
};
