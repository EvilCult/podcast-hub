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
        return json({ error: '用户名和密码不能为空' }, { status: 400 });
    }
    if (password.length < 4) {
        return json({ error: '密码至少 4 位' }, { status: 400 });
    }
    if (usernameTaken(username)) {
        return json({ error: '用户名已存在' }, { status: 400 });
    }

    const id = createUser(username, hashPassword(password));
    return json({ id, username });
};
