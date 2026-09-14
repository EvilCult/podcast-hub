<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
    import { BottomNav, BottomNavItem, Tooltip } from 'flowbite-svelte';
    import {
        HomeSolid,
        WalletSolid,
        AdjustmentsVerticalOutline,
        UserCircleSolid,
        PlusOutline,
        AppleSolid
    } from 'flowbite-svelte-icons';

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
{@render children()}
<BottomNav position="absolute" navType="application" classes={{ inner: 'grid-cols-5' }}>
    <BottomNavItem btnName="Home" appBtnPosition="left">
        <HomeSolid
            class="mb-1 h-6 w-6 text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-500"
        />
    </BottomNavItem>
    <Tooltip arrow={false}>Home</Tooltip>
    <BottomNavItem btnName="Wallet" appBtnPosition="middle">
        <WalletSolid
            class="mb-1 h-6 w-6 text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-500"
        />
    </BottomNavItem>
    <Tooltip arrow={false}>Wallet</Tooltip>
    <div class="flex items-center justify-center">
        <BottomNavItem
            btnName="Create new item"
            appBtnPosition="middle"
            class="group inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 focus:outline-hidden dark:focus:ring-primary-800"
        >
            <PlusOutline class="text-white" />
        </BottomNavItem>
        <Tooltip arrow={false}>Create new item</Tooltip>
    </div>
    <BottomNavItem btnName="Settings" appBtnPosition="middle">
        <AdjustmentsVerticalOutline
            class="mb-1 h-6 w-6 text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-500"
        />
    </BottomNavItem>
    <Tooltip arrow={false}>Settings</Tooltip>
    <BottomNavItem btnName="Profile" appBtnPosition="right">
        <UserCircleSolid
            class="mb-1 h-6 w-6 text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-500"
        />
    </BottomNavItem>
    <Tooltip arrow={false}>Profile</Tooltip>
</BottomNav>
