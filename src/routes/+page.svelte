<script lang="ts">
    import { resolve } from '$app/paths';

    let { data } = $props();
    const radios = $derived(data.radios);
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-4">
    {#each radios as radio (radio.id)}
        <div
            class="max-w-sm rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
            <a href={resolve(`/radio/${radio.id}`)}>
                <img
                    class="rounded-t-lg"
                    src={`/api/image?url=${encodeURIComponent(radio.cover)}`}
                    alt=""
                />
            </a>
            <div class="p-2">
                <a href={resolve(`/radio/${radio.id}`)}>
                    <h5
                        class="mb-2 text-center text-base font-bold tracking-tight text-gray-900 dark:text-white"
                    >
                        {radio.title}
                    </h5>
                </a>
                <p class="mb-3 text-center text-xs font-normal text-gray-700 dark:text-gray-400">
                    {radio.digest}
                </p>
            </div>
        </div>
    {/each}
</div>
