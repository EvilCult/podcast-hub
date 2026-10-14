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
// The audio element is a dumb player of the current segment: the server
// returns a stream starting at `segmentStart` (via ?pos=), so the element's
// currentTime is relative to the segment. Absolute position in the episode:
//   segmentStart + audio.currentTime
// The browser never seeks. All seeks reload the stream with a new ?pos=.
let segmentStart = 0;
// Base transcode URL for the current episode (without ?pos=), rebuilt on
// every playEpisode so seeks always target the right episode.
let baseUrl = '';

/** Absolute playback position in the episode timeline (seconds). */
function absolutePosition(): number {
    return segmentStart + (audio?.currentTime ?? 0);
}

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
                pos: Math.floor(absolutePosition())
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

/**
 * Load the current episode's stream starting at `pos` seconds.
 * Single entry point for every (re)load: initial play, resume, seek.
 */
function loadAt(pos: number) {
    if (!audio) return;
    segmentStart = Math.max(0, Math.floor(pos));
    player.currentTime = segmentStart;
    player.loading = true;
    audio.src = segmentStart > 0 ? `${baseUrl}&pos=${segmentStart}` : baseUrl;
    audio.load();
    void audio.play().catch(() => {
        player.loading = false;
    });
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

    let lastPositionSync = 0;

    audio.addEventListener('timeupdate', () => {
        player.currentTime = absolutePosition();
        // Throttled: the UA interpolates position between updates.
        const now = Date.now();
        if (now - lastPositionSync > 5000) {
            lastPositionSync = now;
            updatePositionState();
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        // Transcoded streams report duration as Infinity/NaN (no metadata);
        // prefer the DB duration which is always reliable.
        const audioDuration =
            audio?.duration && Number.isFinite(audio.duration) ? audio.duration : 0;
        player.duration = player.episode?.duration || audioDuration || 0;
        lastPositionSync = 0;
        updatePositionState();
    });

    audio.addEventListener('seeked', () => {
        lastPositionSync = 0;
        updatePositionState();
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

/** Push current position/duration to the lock screen / system media UI. */
function updatePositionState() {
    if (!browser || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
        return;
    }
    const duration = player.duration;
    if (!duration || !Number.isFinite(duration) || duration <= 0) return;
    try {
        navigator.mediaSession.setPositionState({
            duration,
            playbackRate: player.playbackRate || 1,
            position: Math.min(Math.max(player.currentTime, 0), duration)
        });
    } catch {
        /* invalid state (e.g. duration changed mid-call) */
    }
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
    // Pass the DB duration so the server can compute remaining Content-Length.
    const durationParam =
        episode.duration && episode.duration > 0 ? `&duration=${episode.duration}` : '';
    baseUrl = `/api/transcode?url=${encodeURIComponent(episode.url)}${durationParam}`;

    // Resume: load the stream starting at the saved position.
    const saved = await loadProgress(episode.id);
    const resumePos = saved > 0 && saved < (episode.duration ?? Infinity) - 5 ? saved : 0;

    audio.playbackRate = player.playbackRate;
    loadAt(resumePos);

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
    if (!audio || !player.episode) return;
    const target = Math.max(
        0,
        Math.min(player.duration || Infinity, absolutePosition() + seconds)
    );
    setPosition(target);
}

export function setPosition(value: number) {
    if (!audio || !player.episode) return;
    // The browser never seeks: reload the stream with a new ?pos=.
    loadAt(Math.max(0, value));
}

export function setPlaybackRate(value: number) {
    player.playbackRate = value;

    if (audio) {
        audio.playbackRate = value;
    }
}
