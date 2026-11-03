<script lang="ts">
    let { popupModal = $bindable(), podcast_url = $bindable(), invalidateAll } = $props();
    import { PUBLIC_HOST } from '$env/static/public';

    import {
        Button,
        Input,
        Modal,
        Spinner,
        Toast,
        ToastContainer,
        Dropdown,
        DropdownItem
    } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { slide, fly } from 'svelte/transition';

    let postLoading = $state(false);
    const sourceItems = [
        { label: 'Apple', value: 'apple' },
        { label: 'RSS', value: 'rss' }
    ];
    let source = $state('apple');
    let dropdownOpen = $state(false);

    async function handelAddPodcast() {
        postLoading = true;

        try {
            const res = await fetch(`${PUBLIC_HOST}/api/radio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: podcast_url, source })
            });

            if (!res.ok) {
                show('Failed to add podcast');
                popupModal = false;
                podcast_url = '';
                postLoading = false;
                return;
            }

            popupModal = false;
            podcast_url = '';
            postLoading = false;
            await invalidateAll();
            show('Podcast added successfully');
        } catch (error) {
            show('Failed to add podcast');
            console.log(error);
            popupModal = false;
            podcast_url = '';
            postLoading = false;
        }
    }
    let showToast = $state(false);
    let toastInfo = $state('');
    function show(msg: string) {
        toastInfo = msg;
        showToast = true;

        setTimeout(() => {
            showToast = false;
        }, 3000);
    }
</script>

<Modal form bind:open={popupModal} size="sm" transition={slide}>
    <!-- Focus sink: Flowbite's Dialog auto-focuses the first input/select/button
         on open ([data-autofocus] takes priority). Park focus here so nothing
         visibly focusable is pre-selected. -->
    <div tabindex="-1" data-autofocus class="outline-none" aria-hidden="true"></div>
    <div class="text-center">
        <h3 class="mb-5 text-base font-normal text-gray-500 dark:text-gray-400">Add a Podcast</h3>
        <div class="flex">
            <Button
                color="primary"
                class="rounded-e-none border border-e-0 border-primary-700 whitespace-nowrap"
            >
                {#if source === 'apple'}
                    Apple
                {:else}
                    RSS
                {/if}
                <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
            </Button>
            <Dropdown simple bind:isOpen={dropdownOpen}>
                {#each sourceItems as item (item.label)}
                    <DropdownItem
                        onclick={() => {
                            source = item.value;
                            dropdownOpen = false;
                        }}>{item.label}</DropdownItem
                    >
                {/each}
            </Dropdown>

            <Input
                type="text"
                class="rounded-none py-2.5"
                placeholder={source === 'apple'
                    ? 'https://podcasts.apple.com/us/podcast/xxxxxxxx'
                    : 'https://example.com/feed.xml'}
                bind:value={podcast_url}
                disabled={postLoading}
            />
            {#if postLoading}
                <Button color="primary" disabled class="rounded-s-none p-2!">
                    <Spinner type="dots" color="gray" class="size-4" />
                </Button>
            {:else}
                <Button color="primary" onclick={handelAddPodcast} class="rounded-s-none p-2!"
                    >Subscribe</Button
                >
            {/if}
        </div>
    </div>
</Modal>
<ToastContainer position="top-right">
    {#if showToast}
        <div transition:fly={{ x: 200, duration: 300 }}>
            <Toast color="green">{toastInfo}</Toast>
        </div>
    {/if}
</ToastContainer>
