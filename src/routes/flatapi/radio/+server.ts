import { json } from '@sveltejs/kit';

import { getRadios } from '$lib/server/repos/radio';
import { PUBLIC_HOST } from '$env/static/public';

export function GET() {
    const radios = getRadios();

    const spList = [
        {
            id: 'fav',
            title: 'Fav',
            url: PUBLIC_HOST + '/flatapi/radio/sp/fav'
        },
        {
            id: 'history',
            title: 'History',
            url: PUBLIC_HOST + '/flatapi/radio/sp/history'
        }
    ];

    const radioList = radios.map((radio) => {
        return {
            id: radio.id,
            title: radio.title,
            url: PUBLIC_HOST + '/flatapi/radio/' + radio.id + '/episodes'
        };
    });

    return json([...spList, ...radioList]);
}
