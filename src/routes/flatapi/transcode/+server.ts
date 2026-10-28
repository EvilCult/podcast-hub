import { error, type RequestEvent } from '@sveltejs/kit';
import { spawn, execFile } from 'child_process';
import { randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { promisify } from 'util';

import { DEVICE_PROFILE } from '$lib/server/transcode';
import { INTERNAL_AUDIO_KEY } from '$lib/server/audio';
import { dev } from '$app/environment';

const execFileAsync = promisify(execFile);

/**
 * Flatapi device transcode — independent from the web /api/transcode.
 *
 * The device (ESP32-C3) has fixed, simple needs: one profile (32kHz /
 * 48kbps / mono), no auth (flatapi is unauthenticated by design).
 * Seeking is via ?pos= (seconds): the server seeks at the /api/audio
 * level (byte-range into temp file) and returns the transcoded stream
 * from that point — same model as the web player. Keeping this
 * separate from the web endpoint avoids coupling the two paths.
 */

async function probeBitRate(targetUrl: string): Promise<number | null> {
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
                'format=bit_rate',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                targetUrl
            ],
            { timeout: 15000 }
        );
        const v = parseFloat(stdout.trim());
        return Number.isNaN(v) ? null : v;
    } catch {
        return null;
    }
}

// ffmpeg/ffprobe pull the source through the app's proxy-aware fetch via
// the key-gated internal /api/audio hop (subprocesses can't use our undici
// proxy). Plain HTTP to the app's own port: the external origin may be
// HTTPS, which the app itself doesn't serve.
const internalAudioUrl = (requestUrl: URL, audioUrl: string) => {
    const base = dev
        ? requestUrl.origin
        : `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
    return `${base}/api/audio?url=${encodeURIComponent(audioUrl)}&key=${INTERNAL_AUDIO_KEY}`;
};

export async function GET({ url, fetch }: RequestEvent) {
    const audioUrl = url.searchParams.get('url');
    if (!audioUrl) {
        throw error(400, 'Missing url parameter');
    }

    const posParam = parseFloat(url.searchParams.get('pos') ?? '');
    const pos = Number.isFinite(posParam) && posParam > 0 ? posParam : 0;

    const profile = DEVICE_PROFILE;
    const hopUrl = internalAudioUrl(url, audioUrl);

    // Seeking: fetch the source from the byte offset (estimated from
    // probed source bitrate) into a temp file; ffmpeg reads the file.
    // Download runs in background; ffmpeg starts after 512KB buffered.
    let ffmpegInput = hopUrl;
    let seekTmpFile: string | null = null;
    if (pos > 0) {
        const bitRateBps = await probeBitRate(hopUrl);
        if (bitRateBps !== null && bitRateBps > 0) {
            const sourceOffset = Math.floor((pos * bitRateBps) / 8);
            try {
                const hopRes = await fetch(hopUrl, {
                    headers: { Range: `bytes=${sourceOffset}-` }
                });
                if ((hopRes.ok || hopRes.status === 206) && hopRes.body) {
                    seekTmpFile = `/tmp/podcast-hub-seek-${randomBytes(8).toString('hex')}.mp3`;
                    const fileStream = createWriteStream(seekTmpFile);
                    const body = hopRes.body;

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
                    downloadDone.catch(() => {});

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
    }

    // -reconnect only valid for HTTP inputs, not temp files.
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

    const cleanupTmp = () => {
        if (seekTmpFile) {
            unlink(seekTmpFile).catch(() => {});
            seekTmpFile = null;
        }
    };

    let isControllerClosed = false;

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg[flatapi ${profile.sr}Hz/${profile.br}k]: ${data.toString().trim()}`);
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

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked'
        }
    });
}
