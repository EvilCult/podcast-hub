import { type RequestEvent } from '@sveltejs/kit';

import { encodeGlyphText } from '$lib/server/glyph';

const MAX_TEXT_LENGTH = 120;

/**
 * Renders device-side text (e.g. Chinese podcast titles) into a 1-bit
 * bitmap the firmware can blit directly.
 *
 * GET /flatapi/glyph?text=<urlencoded>&px=16
 * -> 200 application/octet-stream
 * -> body: [width: u16be][height: u16be][packbits(1bpp, MSB-first, 1 = ink)]
 */
export function GET({ url }: RequestEvent) {
	const text = url.searchParams.get('text');
	const px = url.searchParams.get('px');

	if (!text || text.length > MAX_TEXT_LENGTH) {
		return new Response('invalid text', { status: 400 });
	}
	if (px !== null && px !== '16') {
		return new Response('only px=16 is supported', { status: 400 });
	}

	const body = encodeGlyphText(text);
	return new Response(new Uint8Array(body), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Cache-Control': 'public, max-age=86400, immutable'
		}
	});
}
