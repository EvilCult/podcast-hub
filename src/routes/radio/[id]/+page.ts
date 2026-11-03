import type { PageLoad } from './$types';
import { PUBLIC_HOST } from '$env/static/public';

export const load: PageLoad = async ({ params, fetch }) => {
    const radioRes = await fetch(`${PUBLIC_HOST}/api/radio/${params.id}`);
    const radioRst = await radioRes.json();

    const episodeRes = await fetch(`${PUBLIC_HOST}/api/radio/${params.id}/episodes`);
    const episodeRst = await episodeRes.json();

    return {
        radio: radioRst.data,
        episodes: episodeRst.data
    };
};
