import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ALLOWED_HOST = 'cdn.lizhi.fm';

export const GET: RequestHandler = async ({ url, fetch }) => {
    const target = url.searchParams.get('url');

    if (!target) {
        error(400, 'Missing url');
    }

    let imageUrl: URL;

    try {
        imageUrl = new URL(target);
    } catch {
        error(400, 'Invalid url');
    }

    // if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== ALLOWED_HOST) {
    //     error(403, 'Forbidden');
    // }

    const response = await fetch(imageUrl);

    if (!response.ok) {
        error(response.status, 'Upstream image request failed');
    }

    return new Response(response.body, {
        headers: {
            'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400'
        }
    });
};
