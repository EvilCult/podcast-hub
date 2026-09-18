import { browser } from '$app/environment';

export type PlayerEpisode = {
    id: number;
    title: string;
    url: string | null;
    duration: number | null;
};
export type PlayerRadio = { title: string; cover: string | null };

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
const key = (id: number) => `folo-radio-progress:${id}`;
const save = () => {
    if (browser && audio && player.episode && audio.currentTime > 0)
        localStorage.setItem(key(player.episode.id), String(audio.currentTime));
};

export function attachAudio(element: HTMLAudioElement) {
    audio = element;
    audio.addEventListener('play', () => (player.playing = true));
    audio.addEventListener('pause', () => (player.playing = false));
    audio.addEventListener('waiting', () => (player.loading = true));
    audio.addEventListener('canplay', () => (player.loading = false));
    audio.addEventListener('timeupdate', () => (player.currentTime = audio?.currentTime ?? 0));
    audio.addEventListener('loadedmetadata', () => {
        player.duration = audio?.duration || player.episode?.duration || 0;
    });
    audio.addEventListener('error', () => {
        player.loading = false;
        player.error = '音频加载失败，请检查音频地址或跨域设置';
        // const error = audio.error;
        // player.loading = false;
        // player.error = error
        //     ? `音频加载失败 (${error.code}): ${error.message || '未知错误'}`
        //     : '音频加载失败';
        // console.error('Audio error:', {
        //     code: error?.code,
        //     message: error?.message,
        //     src: audio.currentSrc,
        //     networkState: audio.networkState,
        //     readyState: audio.readyState
        // });
    });
    audio.addEventListener('ended', () => {
        player.playing = false;
        save();
    });
}

export function detachAudio() {
    save();
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
    if (!browser || !('mediaSession' in navigator) || !player.episode || !player.radio) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: player.episode.title,
        artist: player.radio.title,
        artwork: player.radio.cover
            ? [{ src: `/api/image?url=${encodeURIComponent(player.radio.cover)}` }]
            : []
    });
}

export async function playEpisode(episode: PlayerEpisode, radio: PlayerRadio) {
    if (!audio || !episode.url) {
        player.error = '该 Episode 没有可播放的音频地址';
        return;
    }
    const proxiedUrl = `/api/audio?url=${encodeURIComponent(episode.url)}`;
    save();
    player.episode = episode;
    player.radio = radio;
    player.error = null;
    player.loading = true;
    player.currentTime = 0;
    player.duration = episode.duration ?? 0;
    audio.src = proxiedUrl;
    audio.playbackRate = player.playbackRate;
    audio.load();
    const saved = browser ? Number(localStorage.getItem(key(episode.id)) ?? 0) : 0;
    audio.addEventListener(
        'loadedmetadata',
        () => {
            if (saved > 0 && saved < (audio?.duration || Infinity) - 5) audio!.currentTime = saved;
        },
        { once: true }
    );
    updateMetadata();
    try {
        await audio.play();
    } catch {
        player.loading = false;
        player.error = '浏览器阻止了自动播放，请再次点击播放';
    }
}

export function togglePlay() {
    if (audio && player.episode) audio.paused ? void audio.play() : audio.pause();
}
export function seek(seconds: number) {
    if (audio)
        audio.currentTime = Math.max(
            0,
            Math.min(audio.duration || Infinity, audio.currentTime + seconds)
        );
}
export function setPosition(value: number) {
    if (audio) audio.currentTime = value;
}
export function setPlaybackRate(value: number) {
    player.playbackRate = value;
    if (audio) audio.playbackRate = value;
}
