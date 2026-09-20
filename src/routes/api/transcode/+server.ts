import { type RequestEvent } from '@sveltejs/kit';
import { spawn, exec } from 'child_process';
import { error } from '@sveltejs/kit';
import { promisify } from 'util';
import { PUBLIC_API_URL } from '$env/static/public';

const execAsync = promisify(exec);

const BYTES_PER_SECOND = 12000;

async function getAudioDuration(targetUrl: string): Promise<number> {
    try {
        const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${targetUrl}"`;
        const { stdout } = await execAsync(cmd);
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : duration;
    } catch (e) {
        console.warn('Failed to get duration via ffprobe:', e);
        return 0;
    }
}

export async function GET({ url, request }: RequestEvent) {
    const audioUrl = url.searchParams.get('url');

    if (!audioUrl) {
        throw error(400, 'Missing url parameter');
    }

    const realSourceUrl = `${PUBLIC_API_URL}/audio?url=${encodeURIComponent(audioUrl)}`;

    const duration = await getAudioDuration(realSourceUrl);
    const totalBytes = duration > 0 ? Math.floor(duration * BYTES_PER_SECOND) : 0;

    const rangeHeader = request.headers.get('range');
    let startByte = 0;

    if (rangeHeader && totalBytes > 0) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        startByte = parseInt(parts[0], 10) || 0;
    }

    const startSeconds = (startByte / BYTES_PER_SECOND).toFixed(2);

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
        realSourceUrl,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        '44100',
        '-ac',
        '1',
        '-b:a',
        '96k',
        '-f',
        'mp3',
        'pipe:1'
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    // ffmpegProcess.stderr.on('data', (data) => {
    //     console.log(`ffmpeg: ${data}`);
    // });

    ffmpegProcess.on('error', (err) => {
        console.error('Failed to start ffmpeg process:', err);
    });

    let isControllerClosed = false;

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
