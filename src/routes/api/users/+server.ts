import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { createUser, isAdmin, listUsers, usernameTaken } from '$lib/server/repos/user';
import { hashPassword } from '$lib/server/auth';

function forbidden() {
    return json({ error: 'Admin only' }, { status: 403 });
}

// GET /api/users -> list all users (admin only)
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user || !isAdmin(locals.user.id)) {
        return forbidden();
    }
    return json({ data: listUsers() });
};

// POST /api/users { username, password } -> create user (admin only)
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user || !isAdmin(locals.user.id)) {
        return forbidden();
    }

    let body: { username?: unknown; password?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password) {
        return json({ error: 'Username and password cannot be empty' }, { status: 400 });
    }
    if (password.length < 4) {
        return json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }
    if (usernameTaken(username)) {
        return json({ error: 'Username already exists' }, { status: 400 });
    }

    const id = createUser(username, hashPassword(password));
    return json({ id, username });
};
