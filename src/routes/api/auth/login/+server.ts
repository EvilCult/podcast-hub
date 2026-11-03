import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getUserByUsername, isAdmin } from '$lib/server/repos/user';
import { sessionCookieHeader, signSession, verifyPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
    let body: { username?: unknown; password?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password) {
        return json({ error: 'Username and password are required' }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
        return json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    const token = signSession({ uid: user.id, username: user.username });
    return json(
        { id: user.id, username: user.username, isAdmin: isAdmin(user.id), tr_preset: user.tr_preset },
        { headers: { 'Set-Cookie': sessionCookieHeader(token) } }
    );
};
