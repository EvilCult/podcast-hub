import type { RequestHandler } from './$types';
import { runRefresh } from '$lib/server/refresh';

// Refresh all subscribed radios: re-fetch each feed and insert new episodes.
// No parameters; the backend silently updates everything.
export const GET: RequestHandler = async () => {
    return runRefresh();
};

export const POST: RequestHandler = async () => {
    return runRefresh();
};
