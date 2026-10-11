import { browser } from '$app/environment';

export type PlayerEpisode = {
    id: number;
    title: string;
    url: string | null;
    duration: number | null;
    pos: number | null;
};

export type PlayerRadio = {
    id: number;
    title: string;
    cover: string | null;
};

type State = {
    episode: PlayerEpisode | null;
    radio: PlayerRadio | null;
    playing: boolean;
    loading: boolean;
    error: string | null;
    currentTime: number;
    duration: number;
    playbackRate: number;
};

export const player = $state<State>({
    episode: null,
    radio: null,
    playing: false,
    loading: false,
    error: null,
    currentTime: 0,
    duration: 0,
    playbackRate: 1
});

let audio: HTMLAudioElement | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;

async function save() {
    if (!browser || !audio || !player.episode || !player.radio || audio.currentTime <= 0) {
        return;
    }

    try {
        await fetch(`/api/episode/${player.episode.id}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pos: Math.floor(audio.currentTime)
            })
        });
    } catch (error) {
        console.error('保存播放进度失败:', error);
    }
}

async function loadProgress(episodeId: number): Promise<number> {
    try {
        const response = await fetch(`/api/episode/${episodeId}/history`);

        if (!response.ok) {
            return 0;
        }

        const data: { pos?: number } = await response.json();

        return data.pos ?? 0;
    } catch (error) {
        console.error('获取播放进度失败:', error);
        return 0;
    }
}

function startSaveTimer() {
    if (saveTimer) return;

    saveTimer = setInterval(() => {
        void save();
    }, 10000);
}

function stopSaveTimer() {
    if (saveTimer) {
        clearInterval(saveTimer);
        saveTimer = null;
    }
}

export function attachAudio(element: HTMLAudioElement) {
    audio = element;

    audio.addEventListener('play', () => {
        player.playing = true;
        startSaveTimer();
    });

    audio.addEventListener('pause', () => {
        player.playing = false;
        void save();
    });

    audio.addEventListener('waiting', () => (player.loading = true));

    audio.addEventListener('canplay', () => (player.loading = false));

    audio.addEventListener('timeupdate', () => {
        player.currentTime = audio?.currentTime ?? 0;
    });

    audio.addEventListener('loadedmetadata', () => {
        // Transcoded streams report duration as Infinity/NaN (no metadata);
        // prefer the DB duration which is always reliable.
        const audioDuration =
            audio?.duration && Number.isFinite(audio.duration) ? audio.duration : 0;
        player.duration = player.episode?.duration || audioDuration || 0;
    });

    audio.addEventListener('error', () => {
        player.loading = false;
        player.error = '音频加载失败，请检查音频地址或跨域设置';
    });

    audio.addEventListener('ended', () => {
        player.playing = false;
        stopSaveTimer();
        void save();
    });
}

export function detachAudio() {
    void save();
    stopSaveTimer();
    audio = null;
}

export function configureMediaSession() {
    if (!browser || !('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
        ['play', togglePlay],
        ['pause', togglePlay],
        ['seekbackward', () => seek(-15)],
        ['seekforward', () => seek(30)]
    ];

    for (const [action, handler] of handlers) {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch {
            /* unsupported */
        }
    }
}

function updateMetadata() {
    if (!browser || !('mediaSession' in navigator) || !player.episode || !player.radio) {
        return;
    }

    // iOS rejects artwork without `sizes` and falls back to the app icon;
    // absolute URL is safer in standalone PWA context.
    const artworkSrc = player.radio.cover
        ? `${location.origin}/api/image?url=${encodeURIComponent(player.radio.cover)}`
        : '';

    navigator.mediaSession.metadata = new MediaMetadata({
        title: player.episode.title,
        artist: player.radio.title,
        artwork: artworkSrc
            ? [96, 128, 192, 256, 384, 512].map((s) => ({
                    src: artworkSrc,
                    sizes: `${s}x${s}`
                }))
            : []
    });
}

export async function playEpisode(episode: PlayerEpisode, radio: PlayerRadio) {
    if (!audio || !episode.url) {
        player.error = '该 Episode 没有可播放的音频地址';
        return;
    }

    await save();

    player.episode = episode;
    player.radio = radio;
    player.error = null;
    player.loading = true;
    player.currentTime = 0;
    player.duration = episode.duration ?? 0;

    // All web playback goes through /api/transcode: the server applies the
    // user's saved tier (or serves the source directly for the "original" tier).
    const proxiedUrl = `/api/transcode?url=${encodeURIComponent(episode.url)}`;

    audio.src = proxiedUrl;
    audio.playbackRate = player.playbackRate;
    audio.load();

    const saved = await loadProgress(episode.id);

    audio.addEventListener(
        'loadedmetadata',
        () => {
            if (saved > 0 && saved < (audio?.duration || Infinity) - 5) {
                audio!.currentTime = saved;
            }
        },
        { once: true }
    );

    updateMetadata();

    try {
        await audio.play();
    } catch (e) {
        player.loading = false;
        // NotAllowedError = genuinely blocked autoplay (needs another tap).
        // Anything else (e.g. NotSupportedError) means the stream itself failed.
        player.error =
            e instanceof DOMException && e.name === 'NotAllowedError'
                ? '浏览器阻止了自动播放，请再次点击播放'
                : `播放失败：${e instanceof Error ? e.message : '音频流加载失败'}`;
    }
}

export function togglePlay() {
    if (!audio || !player.episode) return;

    if (audio.paused) {
        void audio.play();
    } else {
        audio.pause();
    }
}

export function seek(seconds: number) {
    if (audio) {
        audio.currentTime = Math.max(
            0,
            Math.min(audio.duration || Infinity, audio.currentTime + seconds)
        );
    }
}

export function setPosition(value: number) {
    if (audio) {
        audio.currentTime = value;
    }
}

export function setPlaybackRate(value: number) {
    player.playbackRate = value;

    if (audio) {
        audio.playbackRate = value;
    }
}
