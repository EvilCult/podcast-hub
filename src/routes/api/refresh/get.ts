import { type RequestHandler } from '@sveltejs/kit';

import { runRefresh } from '$lib/server/refresh';

export const get: RequestHandler = async ({ url }) => {
    const param = url.searchParams.get('radio_id');
    return runRefresh(param ? Number(param) : undefined);
};
