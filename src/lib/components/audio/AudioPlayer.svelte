<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from 'flowbite-svelte';
    import {
        PauseSolid,
        PlaySolid,
        BackwardStepSolid,
        ForwardStepSolid
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
</script>

<audio bind:this={audio} preload="metadata" class="hidden"></audio>

{#if player.episode}
    <div
        class="fixed bottom-0 left-0 z-50 w-full border-t border-gray-500 bg-gray-100 px-3 py-2 md:grid md:h-24 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:px-6 dark:bg-gray-800 dark:text-gray-200"
    >
        <!-- 封面 -->
        <div class="hidden items-center md:flex">
            {#if player.radio?.cover}
                <img
                    class="size-12 rounded object-cover"
                    src={`/api/image?url=${encodeURIComponent(player.radio.cover)}`}
                    alt=""
                />
            {/if}
        </div>

        <!-- 信息 + 进度 -->
        <div class="min-w-0">
            <div class="truncate text-center text-sm text-gray-700 dark:text-gray-300">
                {player.episode.title} - {player.radio?.title}
            </div>

            <input
                class="mt-1 w-full accent-primary-500"
                type="range"
                min="0"
                max={player.duration || 0}
                step="1"
                value={player.currentTime}
                aria-label="播放进度"
                oninput={(event) =>
                    setPosition(Number((event.currentTarget as HTMLInputElement).value))}
            />

            <div class="text-center text-xs text-gray-400">
                {formatTime(player.currentTime)} / {formatTime(player.duration)}
            </div>
        </div>

        <!-- 控制 -->
        <div class="flex items-center justify-center gap-5">
            <BackwardStepSolid class="size-5 shrink-0" onclick={() => seek(-15)} />

            <Button
                color="light"
                pill={true}
                class="p-2!"
                aria-label={player.playing ? '暂停' : '播放'}
                onclick={togglePlay}
            >
                {#if player.playing}
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
{/if}
