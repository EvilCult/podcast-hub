import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

import { setupProxy } from '$lib/server/proxy';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth';

// Runs once at server startup (dev / preview / node build / docker).
// Honors PROXY_URL (or standard *_proxy env); empty = direct, no behavior change.
setupProxy();

// Paths that never require login.
const PUBLIC_PATHS = new Set(['/login', '/manifest.webmanifest']);
const PUBLIC_PREFIXES = [
    '/_app/', // bundled JS/CSS (the login page needs these too)
    '/icons/', // PWA icons
    '/flatapi/', // device API: unauthenticated by design, independent of the web app
    '/api/auth/login', // the login endpoint itself
    '/api/transcode' // self-discriminates: device mode (explicit sr/br/ch) vs user mode (JWT)
];

function isPublic(pathname: string): boolean {
    if (PUBLIC_PATHS.has(pathname)) return true;
    return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get(SESSION_COOKIE);
    const session = token ? verifySession(token) : null;
    event.locals.user = session ? { id: session.uid, username: session.username } : null;

    if (!isPublic(event.url.pathname) && !event.locals.user) {
        if (event.url.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Login required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        throw redirect(303, '/login');
    }

    return resolve(event);
};
