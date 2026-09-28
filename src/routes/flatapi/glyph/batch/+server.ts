import { type RequestEvent } from '@sveltejs/kit';

import { encodeGlyphText } from '$lib/server/glyph';

const MAX_TEXTS = 10;
const MAX_TEXT_LENGTH = 120;

/**
 * Batch glyph rendering for the ESP32 device.
 *
 * POST /flatapi/glyph/batch
 * Body: {"texts": ["标题1", "标题2", ...], "px": 16}
 * -> 200 application/octet-stream
 * -> body: [count: u16be] then per glyph: [len: u16be][wire data]
 *    wire data: [width: u16be][height: u16be][packbits(1bpp, MSB-first, 1 = ink)]
 *
 * One HTTP round-trip instead of N, to avoid overwhelming the device.
 */
export async function POST({ request }: RequestEvent) {
	let data: { texts?: string[]; px?: number };
	try {
		data = await request.json();
	} catch {
		return new Response('invalid json', { status: 400 });
	}

	const texts = data.texts;
	if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS) {
		return new Response('invalid texts', { status: 400 });
	}
	if (data.px !== undefined && data.px !== 16) {
		return new Response('only px=16 is supported', { status: 400 });
	}

	const parts: Buffer[] = [];
	const countBuf = Buffer.alloc(2);
	countBuf.writeUInt16BE(texts.length, 0);
	parts.push(countBuf);

	for (const text of texts) {
		if (typeof text !== 'string' || text.length === 0 || text.length > MAX_TEXT_LENGTH) {
			return new Response('invalid text entry', { status: 400 });
		}
		const wire = encodeGlyphText(text);
		const lenBuf = Buffer.alloc(2);
		lenBuf.writeUInt16BE(wire.length, 0);
		parts.push(lenBuf);
		parts.push(Buffer.from(wire));
	}

	return new Response(new Uint8Array(Buffer.concat(parts)), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Cache-Control': 'public, max-age=86400, immutable'
		}
	});
}
