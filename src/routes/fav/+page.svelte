<script lang="ts">
    import { resolve } from '$app/paths';
    import { Spinner } from 'flowbite-svelte';
    import { playEpisode } from '$lib/stores/audio-player.svelte';
    import type { PlayerEpisode, PlayerRadio } from '$lib/stores/audio-player.svelte';
    import EpisodeRow, { type RowEpisode } from '$lib/components/EpisodeRow.svelte';

    let { data } = $props();

    let episodes = $state<RowEpisode[]>([]);

    $effect(() => {
        episodes = ((data.episodes ?? []) as RowEpisode[]).map((ep) => ({ ...ep }));
    });
    let page = $state(1);
    let loading = $state(false);
    let hasMore = $state(true);

    function radioOf(ep: RowEpisode): PlayerRadio {
        return { id: ep.radio_id ?? 0, title: ep.radio_title ?? '', cover: ep.radio_cover ?? null };
    }

    function play(item: RowEpisode) {
        void playEpisode(item as PlayerEpisode, radioOf(item));
    }

    async function toggleFav(ep: RowEpisode) {
        const res = await fetch('/api/fav', {
            method: ep.is_fav ? 'DELETE' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episode: ep.id })
        });
        if (!res.ok) return;
        const result = await res.json();
        if (!result.favorited) {
            // unfavorited: drop from this list
            episodes = episodes.filter((e) => e.id !== ep.id);
        } else {
            episodes = episodes.map((e) => (e.id === ep.id ? { ...e, is_fav: true } : e));
        }
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
        const res = await fetch(`/api/fav?p=${nextPage}`);

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
</script>

<div class="mx-auto max-w-3xl bg-gray-100 px-4 pb-8 dark:bg-gray-700">
    {#each episodes as episode (episode.id)}
        <EpisodeRow
            {episode}
            showRadio
            onPlay={play}
            onToggleFav={toggleFav}
            onDelete={deleteEpisode}
        />
    {/each}
    <div id="load-more" class=""></div>
    {#if loading}
        <div class="py-6 text-center text-sm text-gray-500">
            <Spinner type="dots" color="primary" />
        </div>
    {/if}
    {#if !loading && episodes.length === 0}
        <div class="py-16 text-center text-sm text-gray-400">
            还没有收藏，去单集列表点那颗小心心吧
        </div>
    {/if}
</div>
