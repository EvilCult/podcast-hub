<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { Avatar, Button } from 'flowbite-svelte';
    import { PlaySolid } from 'flowbite-svelte-icons';

    let { data } = $props();

    const radio = $derived(data.radio);
    const episodes = $derived(data.episodes);

    let container: HTMLDivElement;
    let ap: any;

    onMount(async () => {
        if (browser) {
            import('aplayer/dist/APlayer.min.css');

            const APlayerModule = await import('aplayer');
            const APlayer = APlayerModule.default;

            ap = new APlayer({
                // fixed: true,
                theme: '#1f2937',
                container: container,
                audio: []
            });
        }
    });

    onDestroy(() => {
        if (ap) ap.destroy();
    });

    function handelPlauy(item) {
        const audio = {
            name: item.title,
            artist: radio.title,
            url: item.url,
            cover: radio.cover
        };
        ap.list.remove(0);
        ap.list.add(audio);
        ap.play();
    }
</script>

<div class="p-6">
    <div class="ml-10 flex space-x-4">
        <Avatar
            src={'/api/image?url=' + encodeURIComponent(radio.cover)}
            cornerStyle="rounded"
            class="size-30 sm:size-30 md:size-48"
        />
        <div class="mt-4 space-y-1 font-medium dark:text-white">
            <div class="text-2xl">{radio.title}</div>
            <div
                class="mt-6 line-clamp-2 text-sm text-gray-500 sm:line-clamp-none dark:text-gray-400"
            >
                {radio.digest}
            </div>
            <div class="mt-2 text-xs text-gray-400 dark:text-gray-400">
                最后更新: {radio.last_update}
            </div>
            <div class="mt-4">
                <Button pill>Play <PlaySolid class="ml-2" /></Button>
            </div>
        </div>
    </div>
</div>
<div bind:this={container} class="px-4 sm:px-8 md:px-12 lg:px-20"></div>

<div
    class="divide-y divide-gray-200 bg-gray-100 px-4 sm:px-8 md:px-12 lg:px-20 dark:divide-gray-800 dark:bg-gray-700"
>
    {#each episodes as episode (episode.id)}
        <a
            href="#"
            class="group block px-4 py-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
            onclick={() => handelPlauy(episode)}
        >
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <h3
                        class="truncate font-medium text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400"
                    >
                        {episode.title}
                    </h3>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {episode.digest.length > 200
                            ? episode.digest.slice(0, 200) + '...'
                            : episode.digest}
                    </p>
                </div>
                <span class="shrink-0 text-sm text-gray-500">
                    {episode.duration}
                </span>
            </div>
        </a>
    {/each}
</div>

<style>
    :global(.aplayer) {
        background: #1f2937 !important;
        box-shadow: none !important;
        color: #ffffff !important;
    }
</style>
