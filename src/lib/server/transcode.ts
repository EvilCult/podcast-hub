/**
 * Optional transcode profile query params for /api/transcode.
 *
 *   ?sr=22050&br=48&ch=1
 *
 * Defaults preserve the historic web-player profile
 * (44100 Hz, 96 kbps, mono). The flatapi device endpoints request the
 * lightweight profile (22050 Hz, 48 kbps, mono) instead.
 */

import type { TierName } from '$lib/tiers';

export interface TranscodeProfile {
	/** sample rate in Hz */
	sr: number;
	/** bitrate in kbps */
	br: number;
	/** channels */
	ch: number;
	/** derived: br * 1000 / 8, used for Content-Range estimation */
	bytesPerSecond: number;
}

export const DEFAULT_PROFILE: TranscodeProfile = {
	sr: 44100,
	br: 96,
	ch: 1,
	bytesPerSecond: 12000
};

/** Device (flatapi) profile: ESP32-C3 friendly. */
/* Note: 22050Hz 触发 MPEG-2 Audio, 解码器内存不足; 改用 32000Hz (MPEG-1)。 */
export const DEVICE_PROFILE: TranscodeProfile = {
	sr: 32000,
	br: 48,
	ch: 1,
	bytesPerSecond: 6000
};

export const TIER_PROFILES: Record<Exclude<TierName, 'original'>, TranscodeProfile> = {
	smooth: { sr: 32000, br: 48, ch: 1, bytesPerSecond: 6000 },
	standard: { sr: 44100, br: 96, ch: 2, bytesPerSecond: 12000 },
	high: { sr: 44100, br: 128, ch: 2, bytesPerSecond: 16000 }
};

function parseBounded(
	params: URLSearchParams,
	key: string,
	fallback: number,
	min: number,
	max: number
): number | null {
	const raw = params.get(key);
	if (raw === null) return fallback;
	if (!/^\d+$/.test(raw)) return null;
	const v = Number(raw);
	if (v < min || v > max) return null;
	return v;
}

export function parseTranscodeProfile(params: URLSearchParams): TranscodeProfile | null {
	const sr = parseBounded(params, 'sr', DEFAULT_PROFILE.sr, 8000, 48000);
	const br = parseBounded(params, 'br', DEFAULT_PROFILE.br, 16, 320);
	const ch = parseBounded(params, 'ch', DEFAULT_PROFILE.ch, 1, 2);
	if (sr === null || br === null || ch === null) return null;
	return { sr, br, ch, bytesPerSecond: Math.floor((br * 1000) / 8) };
}

/** Encodes the device profile as a query string for flatapi URL building. */
export function deviceProfileQuery(): string {
	return `sr=${DEVICE_PROFILE.sr}&br=${DEVICE_PROFILE.br}&ch=${DEVICE_PROFILE.ch}`;
}
