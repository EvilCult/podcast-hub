import { json, type RequestEvent } from '@sveltejs/kit';

import { getRadioById, deleteRadio } from '$lib/server/repos/radio';
import { deleteEpisodeByRadioId } from '$lib/server/repos/episode';

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

export function DELETE({ params }: RequestEvent) {
    const id = Number(params.id);

    if (Number.isNaN(id)) {
        return json({ error: 'Invalid radio id' }, { status: 400 });
    }

    const rst = deleteRadio(id);
    const rst2 = deleteEpisodeByRadioId(id);

    const result = rst && rst2;
    if (!result) {
        return json({ error: 'Delete failed' }, { status: 500 });
    }

    return json({
        result
    });
}
