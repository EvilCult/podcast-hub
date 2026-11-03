// User-selectable transcode tiers, shared between server and client.
// `original` means passthrough: no ffmpeg, serve the source stream directly.

export type TierName = 'smooth' | 'standard' | 'high' | 'original';

export interface TierOption {
    name: TierName;
    label: string;
    desc: string;
}

export const TIER_OPTIONS: TierOption[] = [
    { name: 'smooth', label: 'Smooth', desc: '32kHz · 48kbps · Mono' },
    { name: 'standard', label: 'Standard', desc: '44.1kHz · 96kbps · Stereo' },
    { name: 'high', label: 'High Quality', desc: '44.1kHz · 128kbps · Stereo' },
    { name: 'original', label: 'Original', desc: 'No transcoding, direct source stream' }
];

export function isTierName(v: unknown): v is TierName {
    return v === 'smooth' || v === 'standard' || v === 'high' || v === 'original';
}
