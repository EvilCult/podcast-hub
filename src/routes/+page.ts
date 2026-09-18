import type { PageLoad } from './$types';
export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('/api/radio');
    const rst = await res.json();

    return {
        radios: rst.data
    };
};
