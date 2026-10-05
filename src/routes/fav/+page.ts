import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('/api/fav');
    const result = await res.json();

    return {
        episodes: result.data ?? []
    };
};
