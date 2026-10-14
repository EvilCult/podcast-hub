import { error, type RequestEvent } from '@sveltejs/kit';
import { spawn } from 'child_process';

import { DEVICE_PROFILE } from '$lib/server/transcode';
import { INTERNAL_AUDIO_KEY } from '$lib/server/audio';
import { dev } from '$app/environment';

/**
 * Flatapi device transcode — independent from the web /api/transcode.
 *
 * The device (ESP32-C3) has fixed, simple needs: one profile (32kHz /
 * 48kbps / mono), no seeking, no auth (flatapi is unauthenticated by
 * design), always transcode from the start. Keeping this separate from
 * the web endpoint avoids coupling the two playback paths.
 */

// ffmpeg pulls the source through the app's proxy-aware fetch via the
// key-gated internal /api/audio hop (subprocesses can't use our undici
// proxy). Plain HTTP to the app's own port: the external origin may be
// HTTPS, which the app itself doesn't serve.
const internalAudioUrl = (requestUrl: URL, audioUrl: string) => {
    const base = dev
        ? requestUrl.origin
        : `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
    return `${base}/api/audio?url=${encodeURIComponent(audioUrl)}&key=${INTERNAL_AUDIO_KEY}`;
};

export async function GET({ url }: RequestEvent) {
    const audioUrl = url.searchParams.get('url');
    if (!audioUrl) {
        throw error(400, 'Missing url parameter');
    }

    const profile = DEVICE_PROFILE;
    const hopUrl = internalAudioUrl(url, audioUrl);

    const ffmpegArgs = [
        '-reconnect',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_delay_max',
        '5',
        '-threads',
        '1',
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
        console.error(`ffmpeg[flatapi ${profile.sr}Hz/${profile.br}k]: ${data.toString().trim()}`);
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

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked'
        }
    });
}
