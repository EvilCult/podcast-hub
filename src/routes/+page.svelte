<script lang="ts">
    import { resolve } from '$app/paths';
    import AddPodcast from './AddPodcast.svelte';

    import { invalidateAll } from '$app/navigation';
    import { Card, Button } from 'flowbite-svelte';
    import { PlusOutline } from 'flowbite-svelte-icons';

    let { data } = $props();
    const radios = $derived(data.radios);
    let popupModal = $state(false);
    let podcast_url = $state('');
</script>

<div class="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
    <div class="flex items-center gap-1 px-4 py-2.5">
        <span class="mr-2 text-base font-bold text-gray-900 dark:text-white">播客</span>
        <a
            href={resolve('/fav')}
            class="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >收藏</a
        >
        <a
            href={resolve('/history')}
            class="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >收听记录</a
        >
    </div>
</div>

<div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 p-6">
    {#each radios as radio (radio.id)}
        <div class="space-y-4">
            <Card
                img={`/api/image?url=${encodeURIComponent(radio.cover)}`}
                href={resolve(`/radio/${radio.id}`)}
            >
                <div class="m-2 mt-3">
                    <h5
                        class="mb-1 text-center text-base font-bold tracking-tight text-gray-900 dark:text-white"
                    >
                        {radio.title.length > 15 ? `${radio.title.slice(0, 15)}...` : radio.title}
                    </h5>
                </div>
            </Card>
        </div>
    {/each}
</div>
<Button
    pill={true}
    class="fixed inset-e-6 bottom-30 z-60 p-2! md:bottom-26"
    onclick={() => (popupModal = true)}><PlusOutline class="h-6 w-6" /></Button
>
<AddPodcast bind:popupModal bind:podcast_url {invalidateAll} />
