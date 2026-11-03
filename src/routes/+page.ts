import type { PageLoad } from './$types';
import { PUBLIC_HOST } from '$env/static/public';
export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch(`${PUBLIC_HOST}/api/radio`);
    const rst = await res.json();

    return {
        radios: rst.data
    };
};
