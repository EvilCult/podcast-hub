<script lang="ts">
    let { popupModal = $bindable(), radio_id } = $props();
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';

    import { Button, Modal, Toast, ToastContainer, Spinner } from 'flowbite-svelte';
    import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
    import { slide, fly } from 'svelte/transition';
    import { PUBLIC_HOST } from '$env/static/public';

    let postLoading = $state(false);

    async function handelDelPodcast() {
        postLoading = true;

        try {
            const res = await fetch(`${PUBLIC_HOST}/api/radio/${radio_id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                show('Failed to delete');
                popupModal = false;
                postLoading = false;
                return;
            }

            popupModal = false;
            postLoading = false;
            show('Deleted');
            await goto(resolve('/'));
        } catch (error) {
            show('Failed to delete');
            console.log(error);
            popupModal = false;
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

<Modal form bind:open={popupModal} size="xs" transition={slide} permanent>
    <!-- Focus sink: see AddPodcast.svelte -- Flowbite Dialog auto-focus would
         otherwise pre-select the confirm button on open. -->
    <div tabindex="-1" data-autofocus class="outline-none" aria-hidden="true"></div>
    <div class="text-center">
        <ExclamationCircleOutline class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-200" />
        <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Delete this podcast?
        </h3>
        <div class="space-x-2">
            {#if postLoading}
                <Spinner type="dots" color="gray" class="size-8" />
            {:else}
                <Button type="submit" value="yes" color="red" onclick={handelDelPodcast}
                    >Confirm</Button
                >
                <Button type="submit" value="no" color="alternative">Cancel</Button>
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
