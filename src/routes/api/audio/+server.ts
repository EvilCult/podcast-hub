import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { INTERNAL_AUDIO_KEY, proxyAudioResponse } from '$lib/server/audio';

// INTERNAL endpoint, not a public API.
// Serves only the /api/transcode pipeline (ffmpeg/ffprobe subprocesses pull the
// source audio through the app's proxy-aware fetch via this hop). Requests
// without the per-boot key are rejected, so this is not reachable as a public
// audio proxy. (flatapi device traffic uses /api/transcode directly.)
export const GET: RequestHandler = async ({ url, request, fetch }) => {
    if (url.searchParams.get('key') !== INTERNAL_AUDIO_KEY) {
        throw error(403, 'Forbidden');
    }

    const target = url.searchParams.get('url');
    if (!target) {
        throw error(400, 'Missing url');
    }

    return proxyAudioResponse(target, request, fetch);
};
