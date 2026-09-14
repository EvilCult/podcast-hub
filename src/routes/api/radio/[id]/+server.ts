import { json, type RequestEvent } from '@sveltejs/kit';

import { getRadioById } from '$lib/server/repos/radio';

export function GET({ params }: RequestEvent) {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const radio = getRadioById(id);
    if (!radio) {
        return json({ error: 'Radio not found' }, { status: 404 });
    }
    return json({
        data: radio
    });
}
