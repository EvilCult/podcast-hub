import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { isTierName } from '$lib/tiers';
import { updateUserPreset } from '$lib/server/repos/user';

// POST /api/user/preset { preset } -> update own transcode tier
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Login required' }, { status: 401 });
    }

    let body: { preset?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!isTierName(body.preset)) {
        return json({ error: 'Invalid preset' }, { status: 400 });
    }

    updateUserPreset(locals.user.id, body.preset);
    return json({ ok: true, tr_preset: body.preset });
};
