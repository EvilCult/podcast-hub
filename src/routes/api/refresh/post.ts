import { type RequestHandler } from '@sveltejs/kit';
import { runRefresh } from '$lib/server/refresh';

export const post: RequestHandler = async ({ request }) => {
    let radioId: number | undefined;
    try {
        const data = await request.json();
        if (data?.radio_id !== undefined) {
            radioId = Number(data.radio_id);
        }
    } catch {
        // no JSON body: refresh all
    }
    return runRefresh(radioId);
};
