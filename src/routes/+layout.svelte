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
        <!-- <NavLi href="/">Home</NavLi> -->
    </NavUl>
</Navbar>
<main class="flex-1">
    {@render children()}
</main>
<AudioPlayer />
