import { json } from '@sveltejs/kit';

import { getRadios } from '$lib/server/repos/radio';
import { PUBLIC_HOST } from '$env/static/public';

export function get() {
    const radios = getRadios();

    return json(
        radios.map((radio) => {
            return {
                title: radio.title,
                url: PUBLIC_HOST + '/flatapi/radio/' + radio.id + '/episodes'
            };
        })
    );
}
