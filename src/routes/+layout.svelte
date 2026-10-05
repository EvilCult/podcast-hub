<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
    import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';

    import { AppleSolid } from 'flowbite-svelte-icons';

    let { children } = $props();
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
    </NavUl>
</Navbar>
<!-- bottom padding for the always-visible player bar -->
<main class="flex-1 pb-40 md:pb-28">
    {@render children()}
</main>
<AudioPlayer />
