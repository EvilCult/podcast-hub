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

<div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 p-6">
    {#each radios as radio (radio.id)}
        <div class="space-y-4">
            <Card
                img={`/api/image?url=${encodeURIComponent(radio.cover)}`}
                href={resolve(`/radio/${radio.id}`)}
            >
                <div class="m-2 mt-3 flex h-12 items-center justify-center overflow-hidden">
                    <h5
                        class="line-clamp-2 text-center text-base font-bold tracking-tight text-gray-900 dark:text-white"
                    >
                        {radio.title}
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
