<script lang="ts">
    import { Button, Avatar, Spinner } from 'flowbite-svelte';
    import {
        PlaySolid,
        TrashBinOutline,
        ArrowUpOutline,
        ArrowDownOutline,
        EyeOutline,
        EyeSlashOutline
    } from 'flowbite-svelte-icons';
    import { playEpisode } from '$lib/stores/audio-player.svelte';
    import type { PlayerEpisode, PlayerRadio } from '$lib/stores/audio-player.svelte';
    import EpisodeRow, { type RowEpisode } from '$lib/components/EpisodeRow.svelte';
    import DelPodcast from './DelPodcast.svelte';

    let { data } = $props();
    const radio = $derived(data.radio as PlayerRadio);

    let episodes = $state<RowEpisode[]>([]);
    let page = $state(1);
    let loading = $state(false);
    let hasMore = $state(true);
    let sortAsc = $state(false); // false = newest first (default), true = oldest first
    let hidePlayed = $state(false);

    // (re)load when navigating between radios
    $effect(() => {
        episodes = ((data.episodes ?? []) as RowEpisode[]).map((ep) => ({ ...ep }));
        page = 1;
        hasMore = true;
        sortAsc = false;
        hidePlayed = false;
    });

    function toggleSort() {
        sortAsc = !sortAsc;
        void reloadEpisodes();
    }

    function toggleHidePlayed() {
        hidePlayed = !hidePlayed;
        void reloadEpisodes();
    }

    async function reloadEpisodes() {
        if (loading) return;
        loading = true;
        const res = await fetch(
            `/api/radio/${radio.id}/episodes?p=1&order=${sortAsc ? 'asc' : 'desc'}&hide_played=${hidePlayed ? '1' : '0'}`
        );
        loading = false;
        if (!res.ok) return;
        const result = await res.json();
        episodes = (result.data as RowEpisode[]).map((ep) => ({ ...ep }));
        page = 1;
        hasMore = result.data.length > 0;
    }

    function play(item: RowEpisode) {
        void playEpisode(item as PlayerEpisode, radio);
    }

    // last_update is a unix timestamp in seconds -> yyyy-mm-dd hh:mm:ss
    function fmtTs(ts: number | null | undefined) {
        if (!ts) return '—';
        const d = new Date(ts * 1000);
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }

    async function toggleFav(ep: RowEpisode) {
        const res = await fetch('/api/fav', {
            method: ep.is_fav ? 'DELETE' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episode: ep.id })
        });
        if (!res.ok) return;
        const result = await res.json();
        episodes = episodes.map((e) => (e.id === ep.id ? { ...e, is_fav: result.favorited } : e));
    }

    async function markListened(ep: RowEpisode) {
        if (!ep.duration || ep.duration <= 0) return;
        const res = await fetch(`/api/episode/${ep.id}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pos: ep.duration })
        });
        if (!res.ok) return;
        episodes = episodes.map((e) => (e.id === ep.id ? { ...e, pos: ep.duration } : e));
    }

    async function deleteEpisode(ep: RowEpisode) {
        const res = await fetch(`/api/episode/${ep.id}`, { method: 'DELETE' });
        if (!res.ok) return;
        episodes = episodes.filter((e) => e.id !== ep.id);
    }

    async function loadMore() {
        if (loading || !hasMore) return;

        loading = true;

        const nextPage = page + 1;
        const res = await fetch(
            `/api/radio/${radio.id}/episodes?p=${nextPage}&order=${sortAsc ? 'asc' : 'desc'}&hide_played=${hidePlayed ? '1' : '0'}`
        );

        if (!res.ok) {
            loading = false;
            return;
        }

        const result = await res.json();

        if (result.data.length === 0) {
            hasMore = false;
        } else {
            episodes = [...episodes, ...(result.data as RowEpisode[])];
            page = nextPage;
        }

        loading = false;
    }

    $effect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },

            {
                rootMargin: '200px'
            }
        );

        const target = document.querySelector('#load-more');

        if (target) {
            observer.observe(target);
        }
        return () => observer.disconnect();
    });

    let popupModal = $state(false);
</script>

<div class="p-6">
    <div class="ml-10 flex space-x-4">
        <Avatar
            src={'/api/image?url=' + encodeURIComponent(radio.cover ?? '')}
            cornerStyle="rounded"
            class="size-30 sm:size-30 md:size-48"
        />
        <div class="mt-4 w-full space-y-1 font-medium dark:text-white">
            <div class="text-2xl">
                {radio.title}
            </div>
            <div
                class="mt-6 line-clamp-2 text-sm text-gray-500 sm:line-clamp-none dark:text-gray-400"
            >
                {data.radio.digest}
            </div>
            <div class="mt-2 text-xs text-gray-400">最后更新: {fmtTs(data.radio.last_update)}</div>
            <div class="mt-4 flex w-full items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <Button pill onclick={() => episodes[0] && play(episodes[0])}
                        >Play <PlaySolid class="ml-2" /></Button
                    >
                    <Button pill outline color="dark" title="切换单集排序" onclick={toggleSort}>
                        {sortAsc ? 'Oldest' : 'Newest'}
                        {#if sortAsc}
                            <ArrowUpOutline class="ms-2 h-5 w-5" />
                        {:else}
                            <ArrowDownOutline class="ms-2 h-5 w-5" />
                        {/if}
                    </Button>
                    <Button
                        pill
                        outline={true}
                        class="size-8 p-2!"
                        title={hidePlayed ? '显示已听单集' : '隐藏已听单集'}
                        onclick={toggleHidePlayed}
                    >
                        {#if hidePlayed}
                            <EyeSlashOutline class="size-5 text-gray-500 dark:text-gray-400" />
                        {:else}
                            <EyeOutline class="size-5 text-gray-500 dark:text-gray-400" />
                        {/if}
                    </Button>
                </div>
                <Button
                    pill
                    outline={true}
                    class="size-8 p-2!"
                    title="删除播客"
                    onclick={() => (popupModal = true)}
                >
                    <TrashBinOutline class="size-5 text-primary-700" />
                </Button>
            </div>
        </div>
    </div>
</div>

<div class="bg-gray-100 px-4 sm:px-8 md:px-12 lg:px-20 dark:bg-gray-700">
    {#each episodes as episode (episode.id)}
        <EpisodeRow
            {episode}
            canDelete={data.user?.id === 1}
            onPlay={play}
            onToggleFav={toggleFav}
            onDelete={deleteEpisode}
            onMarkListened={markListened}
        />
    {/each}
    <div id="load-more" class=""></div>
    {#if loading}
        <div class="py-6 text-center text-sm text-gray-500">
            <Spinner type="dots" color="primary" />
        </div>
    {/if}
    {#if !loading && episodes.length === 0}
        <div class="py-12 text-center text-sm text-gray-400">还没有单集</div>
    {/if}
</div>
<DelPodcast bind:popupModal radio_id={radio.id} />
