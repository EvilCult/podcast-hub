// User-selectable transcode tiers, shared between server and client.
// `original` means passthrough: no ffmpeg, serve the source stream directly.

export type TierName = 'smooth' | 'standard' | 'high' | 'original';

export interface TierOption {
    name: TierName;
    label: string;
    desc: string;
}

export const TIER_OPTIONS: TierOption[] = [
    { name: 'smooth', label: '流畅', desc: '32kHz · 48kbps · 单声道' },
    { name: 'standard', label: '标准', desc: '44.1kHz · 96kbps · 立体声' },
    { name: 'high', label: '高品质', desc: '44.1kHz · 128kbps · 立体声' },
    { name: 'original', label: '原始', desc: '不转码，直接源流' }
];

export function isTierName(v: unknown): v is TierName {
    return v === 'smooth' || v === 'standard' || v === 'high' || v === 'original';
}
