<script lang="ts">
    import { resolve } from '$app/paths';
    import { Card } from 'flowbite-svelte';

    let { data } = $props();
    const radios = $derived(data.radios);
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 p-6">
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
                        {radio.title}
                    </h5>
                </div>
            </Card>
        </div>
    {/each}
</div>
