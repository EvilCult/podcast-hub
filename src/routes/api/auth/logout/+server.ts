import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { clearSessionCookieHeader } from '$lib/server/auth';

export const POST: RequestHandler = async () => {
    return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookieHeader() } });
};
