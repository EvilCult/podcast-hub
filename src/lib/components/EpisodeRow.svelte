<script lang="ts">
    import { HeartOutline, HeartSolid, DotsVerticalOutline } from 'flowbite-svelte-icons';

    export type RowEpisode = {
        id: number;
        title: string;
        digest: string | null;
        url: string | null;
        duration: number | null;
        pos: number | null;
        is_fav: boolean;
        radio_id?: number;
        radio_title?: string | null;
        play_time?: number | null;
    };

    type Props = {
        episode: RowEpisode;
        showRadio?: boolean;
        showPlayTime?: boolean;
        onPlay: (ep: RowEpisode) => void;
        onToggleFav: (ep: RowEpisode) => void;
        onDelete: (ep: RowEpisode) => void;
    };

    let {
        episode,
        showRadio = false,
        showPlayTime = false,
        onPlay,
        onToggleFav,
        onDelete
    }: Props = $props();

    let menuOpen = $state(false);

    // Close the menu on outside click / Escape
    $effect(() => {
        if (!menuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('[data-ep-menu]')) {
                menuOpen = false;
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') menuOpen = false;
        };
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    });

    function formatDuration(seconds: number | null) {
        if (!seconds || seconds < 0) return '--:--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const rest = Math.floor(seconds % 60);
        return hours
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
            : `${minutes}:${String(rest).padStart(2, '0')}`;
    }

    function formatPlayTime(ts: number | null | undefined) {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${mm}-${dd} ${hh}:${mi}`;
    }

    function isPlayed(ep: RowEpisode) {
        if (!ep.pos || !ep.duration) return false;
        return ep.pos >= ep.duration - 30;
    }

    const played = $derived(isPlayed(episode));
</script>

<div class="flex items-center gap-1 border-b border-gray-200 px-1 py-3 dark:border-gray-800">
    <!-- favorite heart -->
    <button
        type="button"
        aria-label={episode.is_fav ? '取消收藏' : '收藏'}
        class="shrink-0 rounded-full p-2.5 transition-colors hover:bg-gray-200/60 active:scale-95 dark:hover:bg-gray-700/60"
        onclick={(e) => {
            e.stopPropagation();
            onToggleFav(episode);
        }}
    >
        {#if episode.is_fav}
            <HeartSolid class="size-6 text-red-500" />
        {:else}
            <HeartOutline class="size-6 text-gray-400 dark:text-gray-500" />
        {/if}
    </button>

    <!-- main body: tap to play -->
    <button type="button" class="min-w-0 flex-1 px-1 text-left" onclick={() => onPlay(episode)}>
        <h3 class="truncate text-[15px] font-medium text-gray-900 dark:text-white">
            {episode.title}
        </h3>
        {#if showRadio && episode.radio_title}
            <div class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                {episode.radio_title}
            </div>
        {/if}
        {#if episode.digest}
            <p class="mt-1 line-clamp-3 text-sm leading-relaxed break-words text-gray-500 dark:text-gray-400">
                {episode.digest}
            </p>
        {/if}
        <div class="mt-1.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            {#if played}
                <span class="font-medium text-primary-600 dark:text-primary-400">已听</span>
            {:else if episode.pos && episode.pos > 0}
                <span class="font-medium text-primary-600 dark:text-primary-400">
                    {formatDuration(episode.pos)}
                </span>
                <span>/ {formatDuration(episode.duration)}</span>
            {:else}
                <span>{formatDuration(episode.duration)}</span>
            {/if}
            {#if showPlayTime && episode.play_time}
                <span>·</span>
                <span>上次听到 {formatPlayTime(episode.play_time)}</span>
            {/if}
        </div>
    </button>

    <!-- … menu -->
    <div class="relative shrink-0" data-ep-menu>
        <button
            type="button"
            aria-label="更多操作"
            class="rounded-full p-2.5 transition-colors hover:bg-gray-200/60 active:scale-95 dark:hover:bg-gray-700/60"
            onclick={(e) => {
                e.stopPropagation();
                menuOpen = !menuOpen;
            }}
        >
            <DotsVerticalOutline class="size-5 text-gray-500 dark:text-gray-400" />
        </button>
        {#if menuOpen}
            <div
                class="absolute top-full right-0 z-30 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
            >
                <button
                    type="button"
                    class="block w-full px-4 py-2.5 text-left text-sm text-gray-700 active:bg-gray-100 dark:text-gray-200 dark:active:bg-gray-700"
                    onclick={() => {
                        menuOpen = false;
                        onToggleFav(episode);
                    }}
                >
                    {episode.is_fav ? '取消收藏' : '收藏'}
                </button>
                <button
                    type="button"
                    class="block w-full px-4 py-2.5 text-left text-sm text-red-600 active:bg-gray-100 dark:text-red-400 dark:active:bg-gray-700"
                    onclick={() => {
                        menuOpen = false;
                        onDelete(episode);
                    }}
                >
                    删除
                </button>
            </div>
        {/if}
    </div>
</div>
