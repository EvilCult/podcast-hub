import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
    const res = await fetch(`/api/radio/${params.id}`);
    const result = await res.json();

    return {
        radio: result.data
    };
};
