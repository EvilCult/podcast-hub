import type { PageLoad } from './$types';
import { PUBLIC_HOST } from '$env/static/public';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch(`${PUBLIC_HOST}/api/fav`);
    const result = await res.json();

    return {
        episodes: result.data ?? []
    };
};
