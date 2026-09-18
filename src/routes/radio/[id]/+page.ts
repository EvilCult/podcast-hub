import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
    const radioRes = await fetch(`/api/radio/${params.id}`);
    const radioRst = await radioRes.json();

    const episodeRes = await fetch(`/api/radio/${params.id}/episodes`);
    const episodeRst = await episodeRes.json();

    return {
        radio: radioRst.data,
        episodes: episodeRst.data
    };
};
