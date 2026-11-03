<script lang="ts">
    let { popupModal = $bindable(), podcast_url = $bindable(), invalidateAll } = $props();
    import { PUBLIC_HOST } from '$env/static/public';

    import {
        Button,
        Input,
        ButtonGroup,
        Modal,
        Select,
        Spinner,
        Toast,
        ToastContainer
    } from 'flowbite-svelte';
    import { slide, fly } from 'svelte/transition';

    let postLoading = $state(false);
    // Input source selector: explicit instead of auto-detecting from the URL.
    // Switching it never touches the input's existing state (podcast_url).
    let source = $state('apple');

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
                show('添加失败');
                popupModal = false;
                podcast_url = '';
                postLoading = false;
                return;
            }

            popupModal = false;
            podcast_url = '';
            postLoading = false;
            await invalidateAll();
            show('添加成功');
        } catch (error) {
            show('添加失败');
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

<Modal form bind:open={popupModal} size="xs" transition={slide}>
    <!-- Focus sink: Flowbite's Dialog auto-focuses the first input/select/button
         on open ([data-autofocus] takes priority). Park focus here so nothing
         visibly focusable is pre-selected. -->
    <div tabindex="-1" data-autofocus class="outline-none" aria-hidden="true"></div>
    <div class="text-center">
        <h3 class="mb-5 text-base font-normal text-gray-500 dark:text-gray-400">添加新的PodCast</h3>
        <div class="space-x-2">
            <ButtonGroup class="w-full">
                <!-- Native <select> renders ~2px taller than <input> with identical
                     padding (browser quirk, no appearance-none here), so pin both
                     inner elements to the same height: text-sm (20px) + py-2.5 (20px)
                     + border (2px) = 42px, border-box. -->
                <Select
                    bind:value={source}
                    disabled={postLoading}
                    class="w-24 shrink-0 [&_select]:h-10.5"
                >
                    <option value="apple">Apple</option>
                    <option value="rss">RSS</option>
                </Select>
                <Input
                    id="input-addon-button"
                    type="text"
                    class="[&_input]:h-10.5"
                    placeholder={source === 'apple'
                        ? 'https://podcasts.apple.com/us/podcast/xxxxxxxx'
                        : 'https://example.com/feed.xml'}
                    bind:value={podcast_url}
                    disabled={postLoading}
                />
                {#if postLoading}
                    <Button color="primary" disabled>
                        <Spinner type="dots" color="gray" class="size-4" />
                    </Button>
                {:else}
                    <Button color="primary" onclick={handelAddPodcast}>Add</Button>
                {/if}
            </ButtonGroup>
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
