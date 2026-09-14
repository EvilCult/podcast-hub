import { json } from '@sveltejs/kit';

import { getRadios } from '$lib/server/repos/radio';

export async function get() {
    const radios = getRadios();
    return json({
        message: radios
    });
}
