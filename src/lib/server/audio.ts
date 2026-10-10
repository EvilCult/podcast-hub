import { error } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';

// Per-boot secret gating the internal /api/audio hop used by /api/transcode's
// ffmpeg/ffprobe subprocesses. The route is not a public API: without this key
// it answers 403. Regenerated on every server start.
export const INTERNAL_AUDIO_KEY = randomBytes(32).toString('hex');

// Internal audio fetch step of the transcode pipeline.
// Previously exposed as the public /api/audio route; now only reachable
// through /api/transcode (user "original" tier / smart passthrough).
// NOT exported as a route: flatapi device traffic uses /api/transcode directly.

const PASSTHROUGH_HEADERS = [
    'accept-ranges',
    'cache-control',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified'
];

export async function proxyAudioResponse(
    target: string,
    request: Request,
    fetchFn: typeof fetch
): Promise<Response> {
    let audioUrl: URL;
    try {
        audioUrl = new URL(target);
    } catch {
        throw error(400, 'Invalid url');
    }

    if (audioUrl.protocol !== 'http:' && audioUrl.protocol !== 'https:') {
        throw error(400, 'Unsupported audio URL protocol');
    }

    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('Range', range);

    let upstream: Response;
    try {
        upstream = await fetchFn(audioUrl, {
            headers,
            redirect: 'follow'
        });
    } catch {
        throw error(502, 'Upstream audio request failed');
    }

    if (!upstream.ok && upstream.status !== 206) {
        throw error(upstream.status, 'Upstream audio request failed');
    }

    const responseHeaders = new Headers();
    for (const name of PASSTHROUGH_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
    }

    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders
    });
}
