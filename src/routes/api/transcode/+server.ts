import { error, type RequestEvent } from '@sveltejs/kit';
import { spawn, execFile } from 'child_process';
import { randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
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

/**
 * ffprobe a numeric format entry (duration, bit_rate). Null when unavailable.
 * Bounded by timeout so a slow source can't hold the response headers
 * hostage (tunnels/proxies enforce time-to-first-byte limits).
 */
async function probeFormatNumber(
    targetUrl: string,
    entry: string,
    timeoutMs = 15000
): Promise<number | null> {
    try {
        const { stdout } = await execFileAsync(
            'ffprobe',
            [
                '-v',
                'error',
                '-analyzeduration',
                '5000000',
                '-probesize',
                '5000000',
                '-show_entries',
                `format=${entry}`,
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                targetUrl
            ],
            { timeout: timeoutMs }
        );
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

/**
 * Proxy the source, translating ?pos= (seconds) to a byte Range using the
 * source bitrate. Used by the "original" tier and by the "source already
 * good enough" shortcut (no ffmpeg). The browser never seeks; the server
 * seeks at the /api/audio level.
 */
async function proxyWithPos(
    audioUrl: string,
    request: Request,
    fetchFn: typeof fetch,
    requestUrl: URL,
    pos: number
): Promise<Response> {
    if (pos <= 0) {
        return proxyAudioResponse(audioUrl, request, fetchFn);
    }
    const hopUrl = internalAudioUrl(requestUrl, audioUrl);
    const bitRateBps = await probeFormatNumber(hopUrl, 'bit_rate');
    if (bitRateBps === null || bitRateBps <= 0) {
        // Can't estimate offset: fall back to full stream from 0.
        return proxyAudioResponse(audioUrl, request, fetchFn);
    }
    const byteOffset = Math.floor((pos * bitRateBps) / 8);
    const rangedRequest = new Request(request.url, {
        headers: {
            ...Object.fromEntries(request.headers.entries()),
            Range: `bytes=${byteOffset}-`
        }
    });
    return proxyAudioResponse(audioUrl, rangedRequest, fetchFn);
}

export async function GET({ url, request, fetch, locals }: RequestEvent) {
    const audioUrl = url.searchParams.get('url');

    if (!audioUrl) {
        throw error(400, 'Missing url parameter');
    }

    // Seek position (seconds). The ONLY seek mechanism: the client passes
    // ?pos=, the server seeks at the /api/audio level and returns a stream
    // starting from pos. The browser never seeks (no Range, no 206).
    const posParam = parseFloat(url.searchParams.get('pos') ?? '');
    const pos = Number.isFinite(posParam) && posParam > 0 ? posParam : 0;

    // The web client knows the DB duration and passes it as ?duration=;
    // used to compute the remaining Content-Length.
    const durationParam = parseFloat(url.searchParams.get('duration') ?? '');
    const durationHint = Number.isFinite(durationParam) && durationParam > 0 ? durationParam : null;

    // Profile resolution:
    // - logged-in web user -> their saved tier (smart bitrate rule applies)
    // - anonymous + explicit sr/br/ch -> device (flatapi) mode, unchanged behavior
    // - otherwise -> 401
    let profile: TranscodeProfile;
    const user = locals.user;
    // Duration probed alongside bitrate for logged-in users (parallel, see
    // below); anonymous device profiles probe it separately after.
    let probedDuration: number | null = null;
    // Source bitrate (kbps) for seek byte-offset estimation.
    let srcBrKbps: number | null = null;

    if (user) {
        const row = getUserById(user.id);
        const tier = row && isTierName(row.tr_preset) ? row.tr_preset : 'standard';
        if (tier === 'original') {
            // "原始" tier: no ffmpeg, serve the source stream directly.
            return proxyWithPos(audioUrl, request, fetch, url, pos);
        }
        const target = TIER_PROFILES[tier];
        const hopUrl = internalAudioUrl(url, audioUrl);
        // Probe bitrate + duration in parallel: each is timeout-bounded, so
        // time-to-first-byte is max(probe) instead of sum(probe).
        // Skip the duration probe when the client provided a hint.
        const [bitRateBps, durationVal] = await Promise.all([
            probeFormatNumber(hopUrl, 'bit_rate'),
            durationHint !== null
                ? Promise.resolve(durationHint)
                : probeFormatNumber(hopUrl, 'duration')
        ]);
        probedDuration = durationVal;
        const srcBr = bitRateBps === null ? null : Math.round(bitRateBps / 1000);
        srcBrKbps = srcBr;
        if (srcBr === null) {
            // Source quality unknown: cap at standard, never upscale blindly.
            profile = target.br <= TIER_PROFILES.standard.br ? target : TIER_PROFILES.standard;
        } else if (srcBr <= target.br) {
            // Source already at/below the requested quality: skip useless upscaling.
            return proxyWithPos(audioUrl, request, fetch, url, pos);
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

    // Logged-in users already probed duration in parallel above; anonymous
    // device profiles (explicit sr/br/ch) probe it here.
    const duration = probedDuration ?? (await probeFormatNumber(hopUrl, 'duration')) ?? 0;

    // Seeking: `-ss` does NOT work reliably with HTTP inputs, and pipe:0
    // fails on MP3 frame resync. Instead, fetch the source from the byte
    // offset (estimated from probed source bitrate) via the hop's Range
    // support into a temp file, and have ffmpeg read the file. Download
    // runs in background; ffmpeg starts after initial buffer (512KB).
    // Download (~20MB/s) far outpaces ffmpeg consumption (~100KB/s).
    let ffmpegInput = hopUrl;
    let seekTmpFile: string | null = null;
    if (pos > 0 && srcBrKbps !== null && srcBrKbps > 0) {
        const sourceOffset = Math.floor((pos * srcBrKbps * 1000) / 8);
        try {
            const hopRes = await fetch(hopUrl, {
                headers: { Range: `bytes=${sourceOffset}-` }
            });
            if ((hopRes.ok || hopRes.status === 206) && hopRes.body) {
                seekTmpFile = `/tmp/folo-seek-${randomBytes(8).toString('hex')}.mp3`;
                const fileStream = createWriteStream(seekTmpFile);
                const body = hopRes.body;

                // Background download (don't await).
                const downloadDone = (async () => {
                    const reader = body.getReader();
                    try {
                        for (;;) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            if (!fileStream.write(value)) {
                                await new Promise<void>((resolve) =>
                                    fileStream.once('drain', resolve)
                                );
                            }
                        }
                    } finally {
                        reader.releaseLock();
                        fileStream.end();
                    }
                })();
                // Swallow errors: ffmpeg will hit EOF and exit cleanly.
                downloadDone.catch(() => {});

                // Wait for initial buffer (512KB) or 10s timeout.
                const { stat } = await import('fs/promises');
                const waitStart = Date.now();
                let buffered = false;
                while (Date.now() - waitStart < 10000) {
                    try {
                        const s = await stat(seekTmpFile);
                        if (s.size >= 512 * 1024) {
                            buffered = true;
                            break;
                        }
                    } catch (e) {
                        console.log(e);
                    }
                    // Check if download already finished.
                    const finished = await Promise.race([
                        downloadDone.then(() => true).catch(() => true),
                        new Promise((r) => setTimeout(() => r(false), 200))
                    ]);
                    if (finished) {
                        buffered = true;
                        break;
                    }
                }
                if (buffered) {
                    ffmpegInput = seekTmpFile;
                } else {
                    // Buffer timeout: fall back to full stream.
                    seekTmpFile = null;
                    ffmpegInput = hopUrl;
                }
            }
        } catch (e) {
            console.error('Seek setup failed, falling back to full stream:', e);
            seekTmpFile = null;
            ffmpegInput = hopUrl;
        }
    }

    // -reconnect options are only valid for HTTP inputs; temp files
    // (seek) must not include them ("Option reconnect not found").
    const isHttpInput = ffmpegInput.startsWith('http');
    const ffmpegArgs = [
        ...(isHttpInput
            ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5']
            : []),
        '-threads',
        '1',
        '-i',
        ffmpegInput,
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

    // Clean up the seek temp file when ffmpeg exits.
    const cleanupTmp = () => {
        if (seekTmpFile) {
            unlink(seekTmpFile).catch(() => {});
            seekTmpFile = null;
        }
    };

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
        cleanupTmp();
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
            cleanupTmp();
        }
    });

    // Always 200: the browser never seeks, so no 206 / Content-Range.
    // Content-Length is the remaining bytes when duration is known.
    const headers: Record<string, string> = {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache'
    };
    if (duration > 0) {
        const remaining = pos > 0 ? Math.max(0, duration - pos) : duration;
        const remainingBytes = Math.floor(remaining * bytesPerSecond);
        if (remainingBytes > 0) {
            headers['Content-Length'] = remainingBytes.toString();
        } else {
            headers['Transfer-Encoding'] = 'chunked';
        }
    } else {
        headers['Transfer-Encoding'] = 'chunked';
    }

    return new Response(stream, { status: 200, headers });
}
