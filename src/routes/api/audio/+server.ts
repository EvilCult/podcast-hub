import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    const target = url.searchParams.get('url');

    if (!target) error(400, 'Missing url');

    let audioUrl: URL;
    try {
        audioUrl = new URL(target);
    } catch {
        error(400, 'Invalid url');
    }

    if (audioUrl.protocol !== 'http:' && audioUrl.protocol !== 'https:') {
        error(400, 'Unsupported audio URL protocol');
    }

    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('Range', range);

    let upstream: Response;
    try {
        upstream = await fetch(audioUrl, {
            headers,
            redirect: 'follow'
        });
    } catch {
        error(502, 'Upstream audio request failed');
    }

    if (!upstream.ok && upstream.status !== 206) {
        error(upstream.status, 'Upstream audio request failed');
    }

    const responseHeaders = new Headers();
    for (const name of [
        'accept-ranges',
        'cache-control',
        'content-length',
        'content-range',
        'content-type',
        'etag',
        'last-modified'
    ]) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
    }

    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders
    });
};
