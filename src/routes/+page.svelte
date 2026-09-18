<script lang="ts">
    import { resolve } from '$app/paths';
    import { Card, SpeedDial, SpeedDialTrigger, SpeedDialButton } from 'flowbite-svelte';
    import {
        ShareNodesSolid,
        PrinterSolid,
        DownloadSolid,
        FileCopySolid
    } from 'flowbite-svelte-icons';

    let { data } = $props();
    const radios = $derived(data.radios);
</script>

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
                        {radio.title}
                    </h5>
                </div>
            </Card>
        </div>
    {/each}
</div>
<SpeedDialTrigger class="fixed inset-e-6 bottom-30 z-60 md:bottom-26" />
<SpeedDial>
    <SpeedDialButton name="Share">
        <ShareNodesSolid class="h-6 w-6" />
    </SpeedDialButton>
    <SpeedDialButton name="Print">
        <PrinterSolid class="h-6 w-6" />
    </SpeedDialButton>
    <SpeedDialButton name="Download">
        <DownloadSolid class="h-6 w-6" />
    </SpeedDialButton>
    <SpeedDialButton name="Copy">
        <FileCopySolid class="h-6 w-6" />
    </SpeedDialButton>
</SpeedDial>
