import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

/**
 * Renders text into a 1-bit bitmap using the vendored GNU Unifont 16px BDF
 * bitmap font, then PackBits-compresses it for the device.
 *
 * Wire format (what the firmware expects):
 *   [width: u16be][height: u16be][packbits(1bpp pixels)]
 * Pixels are MSB-first, 1 = ink, rows padded to whole bytes.
 */

interface Glyph {
	/** horizontal advance in pixels */
	adv: number;
	w: number;
	h: number;
	xoff: number;
	yoff: number;
	/** h rows, ceil(w/8) bytes each, MSB-first */
	bitmap: Buffer;
}

interface Font {
	glyphs: Map<number, Glyph>;
	ascent: number;
	descent: number;
}

let fontCache: Font | null = null;

function resolveFontPath(): string {
	const candidates = [
		// cwd-relative: works in `vite dev` and in the docker image (WORKDIR /app)
		resolve('static/fonts/unifont-16.bdf.gz'),
		// relative to this module file (dev fallback)
		resolve(dirname(fileURLToPath(import.meta.url)), '../../../static/fonts/unifont-16.bdf.gz')
	];
	for (const p of candidates) {
		try {
			readFileSync(p);
			return p;
		} catch {
			/* try next */
		}
	}
	throw new Error('glyph font not found; looked in: ' + candidates.join(', '));
}

function parseBdf(src: string): Font {
	const glyphs = new Map<number, Glyph>();
	let ascent = 14;
	let descent = 2;

	const mBox = /^FONTBOUNDINGBOX\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)/m.exec(src);
	if (mBox) {
		const h = Number(mBox[2]);
		const yoff = Number(mBox[4]);
		ascent = h + yoff;
		descent = -yoff;
	}

	const lines = src.split('\n');
	let i = 0;
	while (i < lines.length) {
		if (lines[i].startsWith('STARTCHAR')) {
			let encoding = -1;
			let adv = 16;
			let w = 0;
			let h = 0;
			let xoff = 0;
			let yoff = 0;
			const rows: Buffer[] = [];
			let inBitmap = false;
			i++;
			while (i < lines.length && !lines[i].startsWith('ENDCHAR')) {
				const line = lines[i].trim();
				if (inBitmap) {
					if (line) rows.push(Buffer.from(line, 'hex'));
				} else if (line.startsWith('ENCODING')) {
					encoding = Number(line.split(/\s+/)[1]);
				} else if (line.startsWith('DWIDTH')) {
					adv = Number(line.split(/\s+/)[1]);
				} else if (line.startsWith('BBX')) {
					const p = line.split(/\s+/);
					w = Number(p[1]);
					h = Number(p[2]);
					xoff = Number(p[3]);
					yoff = Number(p[4]);
				} else if (line === 'BITMAP') {
					inBitmap = true;
				}
				i++;
			}
			if (encoding >= 0 && w > 0 && h > 0) {
				glyphs.set(encoding, { adv, w, h, xoff, yoff, bitmap: Buffer.concat(rows) });
			}
		}
		i++;
	}

	return { glyphs, ascent, descent };
}

function getFont(): Font {
	if (!fontCache) {
		const raw = gunzipSync(readFileSync(resolveFontPath()));
		fontCache = parseBdf(raw.toString('latin1'));
	}
	return fontCache;
}

function setPixel(
	buf: Buffer,
	stride: number,
	x: number,
	y: number,
	width: number,
	height: number
) {
	if (x < 0 || y < 0 || x >= width || y >= height) return;
	buf[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
}

/** Draws a hollow box as the .notdef fallback so missing glyphs are visible. */
function drawTofu(buf: Buffer, stride: number, penX: number, width: number, height: number) {
	const x0 = penX + 2;
	const x1 = penX + 13;
	const y0 = 2;
	const y1 = 13;
	for (let x = x0; x <= x1; x++) {
		setPixel(buf, stride, x, y0, width, height);
		setPixel(buf, stride, x, y1, width, height);
	}
	for (let y = y0; y <= y1; y++) {
		setPixel(buf, stride, x0, y, width, height);
		setPixel(buf, stride, x1, y, width, height);
	}
}

export interface RenderedText {
	width: number;
	height: number;
	/** 1bpp, MSB-first, rows padded to whole bytes */
	pixels: Buffer;
}

export function renderText(text: string): RenderedText {
	const font = getFont();
	const height = font.ascent + font.descent;

	// measure
	let width = 0;
	const cps: number[] = [];
	for (const ch of text) {
		const cp = ch.codePointAt(0)!;
		cps.push(cp);
		width += font.glyphs.get(cp)?.adv ?? 16;
	}

	const stride = Math.ceil(width / 8);
	const buf = Buffer.alloc(stride * height);
	let penX = 0;

	for (const cp of cps) {
		const g = font.glyphs.get(cp);
		if (!g) {
			drawTofu(buf, stride, penX, width, height);
			penX += 16;
			continue;
		}
		const rowStride = Math.ceil(g.w / 8);
		const top = font.ascent - (g.yoff + g.h);
		for (let r = 0; r < g.h; r++) {
			for (let c = 0; c < g.w; c++) {
				if (g.bitmap[r * rowStride + (c >> 3)] & (0x80 >> (c & 7))) {
					setPixel(buf, stride, penX + g.xoff + c, top + r, width, height);
				}
			}
		}
		penX += g.adv;
	}

	return { width, height, pixels: buf };
}

/** TIFF-style PackBits encoder (must match the firmware decoder). */
export function packBits(src: Buffer): Buffer {
	const out: number[] = [];
	let i = 0;
	const n = src.length;
	while (i < n) {
		let run = 1;
		while (i + run < n && src[i + run] === src[i] && run < 128) run++;
		if (run > 2) {
			out.push(257 - run, src[i]);
			i += run;
			continue;
		}
		let j = i + 1;
		while (j < n && j - i < 128) {
			let k = 1;
			while (j + k < n && src[j + k] === src[j] && k < 128) k++;
			if (k > 2) break;
			j++;
		}
		out.push(j - i - 1);
		for (let t = i; t < j; t++) out.push(src[t]);
		i = j;
	}
	return Buffer.from(out);
}

/** Code points in text that have no glyph (rendered as tofu box). */
export function findMissing(text: string): number[] {
	const font = getFont();
	const missing: number[] = [];
	for (const ch of text) {
		const cp = ch.codePointAt(0)!;
		if (!font.glyphs.get(cp)) missing.push(cp);
	}
	return missing;
}

/** Full wire payload: [w: u16be][h: u16be][packbits pixels]. */
export function encodeGlyphText(text: string): Buffer {
	const { width, height, pixels } = renderText(text);
	const header = Buffer.alloc(4);
	header.writeUInt16BE(width, 0);
	header.writeUInt16BE(height, 2);
	return Buffer.concat([header, packBits(pixels)]);
}
