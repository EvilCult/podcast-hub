<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Button } from 'flowbite-svelte';
    import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
    import { goto } from '$app/navigation';

    import { AppleSolid } from 'flowbite-svelte-icons';

    let { children, data } = $props();

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        await goto('/login');
    }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Navbar class="dark:bg-gray-800">
    <NavBrand href="/">
        <AppleSolid class="mr-2 h-7 w-7 shrink-0 text-gray-100" />
        <span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white"
            >PodCast Streaming Proxy</span
        >
    </NavBrand>
    <NavHamburger />
    <NavUl>
        <NavLi href="/">Home</NavLi>
        <NavLi href="/history">History</NavLi>
        <NavLi href="/fav">Fav</NavLi>
        {#if data.user}
            <NavLi href="/settings">Settings</NavLi>
        {/if}
    </NavUl>
    {#if data.user}
        <div class="flex items-center gap-3">
            <span class="hidden text-sm text-gray-500 sm:inline dark:text-gray-400">{data.user.username}</span>
            <Button size="xs" color="light" onclick={logout}>登出</Button>
        </div>
    {/if}
</Navbar>
<!-- bottom padding for the always-visible player bar -->
<main class="flex-1 pb-40 md:pb-28">
    {@render children()}
</main>
<AudioPlayer />
