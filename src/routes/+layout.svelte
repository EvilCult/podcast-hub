<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import {
        Navbar,
        NavBrand,
        NavLi,
        NavUl,
        NavHamburger,
        Dropdown,
        DropdownItem,
        DropdownDivider
    } from 'flowbite-svelte';
    import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';

    import { AppleSolid, ChevronDownOutline } from 'flowbite-svelte-icons';

    let { children, data } = $props();

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        await goto(resolve('/login'));
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
    {#if data.user}
        <NavUl>
            <!-- Desktop: user dropdown -->
            <NavLi class="hidden cursor-pointer md:block">
                {data.user.username}<ChevronDownOutline class="ms-2 inline h-6 w-6" />
            </NavLi>
            <Dropdown simple class="hidden w-44 md:block">
                <DropdownItem href="/history">History</DropdownItem>
                <DropdownItem href="/fav">Fav</DropdownItem>
                <DropdownItem href="/settings">Settings</DropdownItem>
                <DropdownDivider />
                <DropdownItem onclick={logout}>Logout</DropdownItem>
            </Dropdown>
            <!-- Mobile: plain items inside the folded hamburger menu -->
            <NavLi href="/history" class="md:hidden">History</NavLi>
            <NavLi href="/fav" class="md:hidden">Fav</NavLi>
            <NavLi href="/settings" class="md:hidden">Settings</NavLi>
            <NavLi class="cursor-pointer md:hidden" onclick={logout}>Logout</NavLi>
        </NavUl>
    {/if}
</Navbar>
<!-- bottom padding for the always-visible player bar -->
<main class="flex-1 pb-40 md:pb-28">
    {@render children()}
</main>
<AudioPlayer />
