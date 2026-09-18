<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from 'flowbite-svelte';
    import { PauseSolid, PlaySolid } from 'flowbite-svelte-icons';
    import {
        attachAudio,
        configureMediaSession,
        detachAudio,
        player,
        seek,
        setPlaybackRate,
        setPosition,
        togglePlay
    } from '$lib/stores/audio-player.svelte';

    let audio: HTMLAudioElement;

    const formatTime = (value: number) => {
        if (!Number.isFinite(value)) return '0:00';
        return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
    };

    onMount(() => {
        attachAudio(audio, () => undefined);
        configureMediaSession();
    });

    onDestroy(detachAudio);
</script>

<audio bind:this={audio} preload="metadata" class="hidden"></audio>

{#if player.episode}
    <section
        class="mx-4 my-4 rounded-lg bg-gray-800 p-4 text-white shadow-lg sm:mx-8 md:mx-12 lg:mx-20"
    >
        <div class="flex items-center gap-3">
            {#if player.radio?.cover}
                <img
                    class="size-12 rounded object-cover"
                    src={`/api/image?url=${encodeURIComponent(player.radio.cover)}`}
                    alt=""
                />
            {/if}
            <div class="min-w-0 flex-1">
                <div class="truncate font-medium">{player.episode.title}</div>
                <div class="truncate text-sm text-gray-400">{player.radio?.title}</div>
            </div>
            <Button
                color="light"
                pill
                aria-label={player.playing ? '暂停' : '播放'}
                onclick={togglePlay}
            >
                {#if player.playing}<PauseSolid />{:else}<PlaySolid />{/if}
            </Button>
        </div>
        <input
            class="mt-3 w-full accent-primary-500"
            type="range"
            min="0"
            max={player.duration || 0}
            step="1"
            value={player.currentTime}
            aria-label="播放进度"
            oninput={(event) =>
                setPosition(Number((event.currentTarget as HTMLInputElement).value))}
        />
        <div class="flex items-center justify-center text-xs text-gray-400">
            <span>{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>
        </div>
        {#if player.error}<p class="mt-2 text-sm text-red-300">{player.error}</p>{/if}
    </section>
{/if}
