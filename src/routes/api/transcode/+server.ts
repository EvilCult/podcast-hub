import { error, type RequestEvent } from '@sveltejs/kit';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';

import {
    DEFAULT_PROFILE,
    TIER_PROFILES,
    parseTranscodeProfile,
    type TranscodeProfile
} from '$lib/server/transcode';
import { isTierName } from '$lib/tiers';
import { INTERNAL_AUDIO_KEY, proxyAudioResponse } from '$lib/server/audio';
import { getUserById } from '$lib/server/repos/user';
import { dev } from '$app/environment';

const execFileAsync = promisify(execFile);

/** ffprobe a numeric format entry (duration, bit_rate). Null when unavailable. */
async function probeFormatNumber(targetUrl: string, entry: string): Promise<number | null> {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v',
            'error',
            '-show_entries',
            `format=${entry}`,
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            targetUrl
        ]);
        const v = parseFloat(stdout.trim());
        return Number.isNaN(v) ? null : v;
    } catch {
        return null;
    }
}

// ffmpeg/ffprobe pull the source through the app's proxy-aware fetch via the
// key-gated internal /api/audio hop (subprocesses can't use our undici proxy).
// The hop must use plain HTTP to the app's own port: the external origin may
// be HTTPS (reverse proxy / tunnel terminates TLS), which the app itself
// doesn't serve -- ffmpeg would fail with "unexpected TLS packet".
const internalAudioUrl = (requestUrl: URL, audioUrl: string) => {
    const base = dev
        ? requestUrl.origin // vite dev: plain HTTP on localhost, no TLS involved
        : `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
    return `${base}/api/audio?url=${encodeURIComponent(audioUrl)}&key=${INTERNAL_AUDIO_KEY}`;
};

export async function GET({ url, request, fetch, locals }: RequestEvent) {
    const audioUrl = url.searchParams.get('url');

    if (!audioUrl) {
        throw error(400, 'Missing url parameter');
    }

    // Profile resolution:
    // - logged-in web user -> their saved tier (smart bitrate rule applies)
    // - anonymous + explicit sr/br/ch -> device (flatapi) mode, unchanged behavior
    // - otherwise -> 401
    let profile: TranscodeProfile;
    const user = locals.user;

    if (user) {
        const row = getUserById(user.id);
        const tier = row && isTierName(row.tr_preset) ? row.tr_preset : 'standard';
        if (tier === 'original') {
            // "原始" tier: no ffmpeg, serve the source stream directly.
            return proxyAudioResponse(audioUrl, request, fetch);
        }
        const target = TIER_PROFILES[tier];
        const hopUrl = internalAudioUrl(url, audioUrl);
        const bitRateBps = await probeFormatNumber(hopUrl, 'bit_rate');
        const srcBr = bitRateBps === null ? null : Math.round(bitRateBps / 1000);
        if (srcBr === null) {
            // Source quality unknown: cap at standard, never upscale blindly.
            profile = target.br <= TIER_PROFILES.standard.br ? target : TIER_PROFILES.standard;
        } else if (srcBr <= target.br) {
            // Source already at/below the requested quality: skip useless upscaling.
            return proxyAudioResponse(audioUrl, request, fetch);
        } else {
            profile = target;
        }
    } else {
        const hasExplicit = ['sr', 'br', 'ch'].some((k) => url.searchParams.get(k) !== null);
        if (!hasExplicit) {
            throw error(401, 'Login required');
        }
        const parsed = parseTranscodeProfile(url.searchParams);
        if (!parsed) {
            throw error(400, 'Invalid transcode profile (sr/br/ch out of range)');
        }
        profile = parsed;
    }

    const bytesPerSecond = profile.bytesPerSecond || DEFAULT_PROFILE.bytesPerSecond;

    const hopUrl = internalAudioUrl(url, audioUrl);

    const duration = (await probeFormatNumber(hopUrl, 'duration')) ?? 0;
    const totalBytes = duration > 0 ? Math.floor(duration * bytesPerSecond) : 0;

    const rangeHeader = request.headers.get('range');
    let startByte = 0;

    if (rangeHeader && totalBytes > 0) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        startByte = parseInt(parts[0], 10) || 0;
    }

    const startSeconds = (startByte / bytesPerSecond).toFixed(2);

    const ffmpegArgs = [
        '-reconnect',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_delay_max',
        '5',
        '-threads',
        '1',
        '-ss',
        startSeconds,
        '-i',
        hopUrl,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        String(profile.sr),
        '-ac',
        String(profile.ch),
        '-b:a',
        `${profile.br}k`,
        '-write_xing',
        '0',
        '-id3v2_version',
        '0',
        '-f',
        'mp3',
        'pipe:1'
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    let isControllerClosed = false;

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg[${profile.sr}Hz/${profile.br}k]: ${data.toString().trim()}`);
    });

    ffmpegProcess.on('error', (err) => {
        console.error('Failed to start ffmpeg process:', err);
    });

    ffmpegProcess.on('close', (code) => {
        if (code !== 0 && !isControllerClosed) {
            console.error(`ffmpeg exited with code ${code} for ${audioUrl.slice(0, 80)}`);
        }
    });

    const stream = new ReadableStream({
        start(controller) {
            ffmpegProcess.stdout.on('data', (chunk) => {
                if (!isControllerClosed) {
                    try {
                        controller.enqueue(chunk);
                    } catch (e) {
                        console.log(e);
                        isControllerClosed = true;
                    }
                }
            });

            ffmpegProcess.stdout.on('end', () => {
                if (!isControllerClosed) {
                    isControllerClosed = true;
                    try {
                        controller.close();
                    } catch (e) {
                        console.log(e);
                    }
                }
            });

            ffmpegProcess.stdout.on('error', (err) => {
                if (!isControllerClosed) {
                    isControllerClosed = true;
                    try {
                        controller.error(err);
                    } catch (e) {
                        console.log(e);
                    }
                }
            });
        },
        cancel() {
            isControllerClosed = true;
            ffmpegProcess.kill('SIGKILL');
        }
    });

    if (rangeHeader && totalBytes > 0) {
        const chunkSize = totalBytes - startByte;
        return new Response(stream, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${startByte}-${totalBytes - 1}/${totalBytes}`,
                'Content-Length': chunkSize.toString(),
                'Cache-Control': 'no-cache'
            }
        });
    }

    const headers: Record<string, string> = {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
    };

    if (totalBytes > 0) {
        headers['Content-Length'] = totalBytes.toString();
    } else {
        headers['Transfer-Encoding'] = 'chunked';
    }

    return new Response(stream, { status: 200, headers });
}
