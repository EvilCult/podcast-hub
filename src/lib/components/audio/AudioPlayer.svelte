<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button, Spinner } from 'flowbite-svelte';
    import {
        PauseSolid,
        PlaySolid,
        BackwardStepSolid,
        ForwardStepSolid,
        MusicOutline
    } from 'flowbite-svelte-icons';
    import {
        attachAudio,
        configureMediaSession,
        detachAudio,
        player,
        seek,
        setPosition,
        togglePlay
    } from '$lib/stores/audio-player.svelte';
    import { PUBLIC_HOST } from '$env/static/public';

    let audio: HTMLAudioElement;

    const formatTime = (value: number) => {
        if (!Number.isFinite(value)) return '0:00';
        return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
    };

    onMount(() => {
        attachAudio(audio);
        configureMediaSession();
    });

    onDestroy(detachAudio);

    const hasEpisode = $derived(player.episode != null);
</script>

<audio bind:this={audio} preload="metadata" class="hidden"></audio>

<div
    class="fixed bottom-0 left-0 z-50 w-full border-t border-gray-500 bg-gray-100 px-3 py-2 md:grid md:h-24 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:px-6 dark:bg-gray-800 dark:text-gray-200"
>
    <!-- 封面 -->
    <div class="relative hidden items-center md:flex">
        {#if player.episode && player.radio?.cover}
            <img
                class="size-12 rounded object-cover"
                src={`${PUBLIC_HOST}/api/image?url=${encodeURIComponent(player.radio.cover)}`}
                alt=""
            />
        {:else}
            <div
                class="flex size-12 items-center justify-center rounded bg-gray-300 dark:bg-gray-700"
            >
                <MusicOutline class="size-6 text-gray-500 dark:text-gray-400" />
            </div>
        {/if}
        {#if player.loading && hasEpisode}
            <div class="absolute inset-0 flex items-center justify-center rounded bg-black/40">
                <Spinner class="size-6 text-white" />
            </div>
        {/if}
    </div>

    <!-- 信息 + 进度 -->
    <div class="min-w-0">
        <div class="truncate text-center text-sm text-gray-700 dark:text-gray-300">
            {#if player.episode}
                {player.episode.title} - {player.radio?.title}
            {:else}
                <span class="text-gray-400 dark:text-gray-500">暂无播放内容</span>
            {/if}
        </div>

        <input
            class="mt-1 w-full accent-primary-500 disabled:opacity-50"
            type="range"
            min="0"
            max={player.duration || 0}
            step="1"
            value={player.currentTime}
            aria-label="播放进度"
            disabled={!hasEpisode}
            oninput={(event) =>
                setPosition(Number((event.currentTarget as HTMLInputElement).value))}
        />

        <div class="text-center text-xs text-gray-400">
            {formatTime(player.currentTime)} / {formatTime(player.duration)}
        </div>
    </div>

    <!-- 控制 -->
    <div
        class="flex items-center justify-center gap-5 {hasEpisode
            ? ''
            : 'pointer-events-none opacity-40'}"
    >
        <BackwardStepSolid class="size-5 shrink-0" onclick={() => seek(-15)} />

        <Button
            color="light"
            pill={true}
            class="p-2!"
            aria-label={player.playing ? '暂停' : '播放'}
            disabled={!hasEpisode}
            onclick={togglePlay}
        >
            {#if player.loading && hasEpisode}
                <Spinner class="size-5" />
            {:else if player.playing}
                <PauseSolid />
            {:else}
                <PlaySolid />
            {/if}
        </Button>

        <ForwardStepSolid class="size-5 shrink-0" onclick={() => seek(15)} />
    </div>

    {#if player.error}
        <p class="col-span-full truncate text-center text-xs text-red-400">
            {player.error}
        </p>
    {/if}
</div>
