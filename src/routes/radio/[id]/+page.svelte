<script lang="ts">
    import { Button, Avatar } from 'flowbite-svelte';
    import { PlaySolid } from 'flowbite-svelte-icons';
    import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
    import { playEpisode } from '$lib/stores/audio-player.svelte';
    import type { PlayerEpisode, PlayerRadio } from '$lib/stores/audio-player.svelte';

    let { data } = $props();
    const radio = $derived(data.radio as PlayerRadio);
    const episodes = $derived(data.episodes as (PlayerEpisode & { digest: string | null })[]);

    function play(item: PlayerEpisode) {
        void playEpisode(item, radio);
    }

    function formatDuration(seconds: number | null) {
        if (!seconds || seconds < 0) return '--:--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const rest = Math.floor(seconds % 60);
        return hours
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
            : `${minutes}:${String(rest).padStart(2, '0')}`;
    }
</script>

<div class="p-6">
    <div class="ml-10 flex space-x-4">
        <Avatar
            src={'/api/image?url=' + encodeURIComponent(radio.cover ?? '')}
            cornerStyle="rounded"
            class="size-30 sm:size-30 md:size-48"
        />
        <div class="mt-4 space-y-1 font-medium dark:text-white">
            <div class="text-2xl">{radio.title}</div>
            <div
                class="mt-6 line-clamp-2 text-sm text-gray-500 sm:line-clamp-none dark:text-gray-400"
            >
                {data.radio.digest}
            </div>
            <div class="mt-2 text-xs text-gray-400">最后更新: {data.radio.last_update}</div>
            <div class="mt-4">
                <Button pill onclick={() => episodes[0] && play(episodes[0])}
                    >Play <PlaySolid class="ml-2" /></Button
                >
            </div>
        </div>
    </div>
</div>

<AudioPlayer />

<div
    class="divide-y divide-gray-200 bg-gray-100 px-4 sm:px-8 md:px-12 lg:px-20 dark:divide-gray-800 dark:bg-gray-700"
>
    {#each episodes as episode (episode.id)}
        {@const digest = episode.digest ?? ''}
        <button
            type="button"
            class="group block w-full px-4 py-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
            onclick={() => play(episode)}
        >
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <h3
                        class="truncate font-medium text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400"
                    >
                        {episode.title}
                    </h3>
                    <p class="mt-1 text-sm break-all text-gray-500 dark:text-gray-400">
                        {digest.length > 200 ? `${digest.slice(0, 200)}...` : digest}
                    </p>
                </div>
                <span class="shrink-0 text-sm text-gray-500"
                    >{formatDuration(episode.duration)}</span
                >
            </div>
        </button>
    {/each}
</div>
