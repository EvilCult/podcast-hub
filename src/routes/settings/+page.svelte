<script lang="ts">
    import { PUBLIC_HOST } from '$env/static/public';
    import { invalidateAll } from '$app/navigation';
    import { Button, Card, Input, Label, Select } from 'flowbite-svelte';

    import { TIER_OPTIONS, isTierName } from '$lib/tiers';
    import type { MeInfo, UserListItem } from './+page';

    let { data } = $props();
    let me: MeInfo = $derived(data.me);
    let users: UserListItem[] = $derived(data.users);

    // ---- change username ----
    let usernameInput: string = $state('');
    let usernameInit = false;
    $effect(() => {
        if (!usernameInit && data.me.username) {
            usernameInput = data.me.username;
            usernameInit = true;
        }
    });
    let unMsg = $state('');
    let unOk = $state(false);
    let unLoading = $state(false);

    async function updateUsername() {
        unMsg = '';
        unOk = false;
        if (!usernameInput.trim()) {
            unMsg = 'Username cannot be empty';
            return;
        }
        unLoading = true;
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/auth/username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUsername: usernameInput.trim() })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                unMsg = body.error ?? 'Update failed';
                return;
            }
            unOk = true;
            unMsg = 'Username updated';
            await invalidateAll();
        } catch {
            unMsg = 'Network error, please try again';
        } finally {
            unLoading = false;
        }
    }

    // ---- change password ----
    let oldPassword = $state('');
    let newPassword = $state('');
    let confirmPassword = $state('');
    let pwMsg = $state('');
    let pwOk = $state(false);
    let pwLoading = $state(false);

    async function changePassword() {
        pwMsg = '';
        pwOk = false;
        if (!oldPassword || !newPassword) {
            pwMsg = 'Enter the current and new passwords';
            return;
        }
        if (newPassword !== confirmPassword) {
            pwMsg = 'The new passwords do not match';
            return;
        }
        pwLoading = true;
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/auth/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                pwMsg = body.error ?? 'Update failed';
                return;
            }
            pwOk = true;
            pwMsg = 'Password updated';
            oldPassword = '';
            newPassword = '';
            confirmPassword = '';
        } catch {
            pwMsg = 'Network error, please try again';
        } finally {
            pwLoading = false;
        }
    }

    // ---- transcode preset ----
    let preset: string = $state('standard');
    let presetInit = false;
    $effect(() => {
        // initialize once from server data; later data refreshes must not
        // clobber an unsaved selection
        if (!presetInit && isTierName(data.me.tr_preset)) {
            preset = data.me.tr_preset;
            presetInit = true;
        }
    });
    let presetMsg = $state('');
    let presetLoading = $state(false);

    async function savePreset() {
        presetMsg = '';
        if (!isTierName(preset)) {
            presetMsg = 'Invalid tier';
            return;
        }
        presetLoading = true;
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/user/preset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preset })
            });
            const body = await res.json().catch(() => ({}));
            presetMsg = res.ok ? 'Saved. Applies to newly played episodes.' : (body.error ?? 'Failed to save');
        } catch {
            presetMsg = 'Network error, please try again';
        } finally {
            presetLoading = false;
        }
    }

    // ---- admin: user management ----
    let newUsername = $state('');
    let newUserPassword = $state('');
    let userMsg = $state('');
    let userLoading = $state(false);

    async function addUser() {
        userMsg = '';
        if (!newUsername.trim() || !newUserPassword) {
            userMsg = 'Enter a username and password';
            return;
        }
        userLoading = true;
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername.trim(), password: newUserPassword })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                userMsg = body.error ?? 'Failed to add user';
                return;
            }
            newUsername = '';
            newUserPassword = '';
            await invalidateAll();
        } catch {
            userMsg = 'Network error, please try again';
        } finally {
            userLoading = false;
        }
    }

    async function deleteUser(id: number, username: string) {
        if (!confirm(`Delete user ${username}? Their history and favorites will be deleted as well.`)) return;
        userMsg = '';
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/users/${id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                userMsg = body.error ?? 'Failed to delete user';
                return;
            }
            await invalidateAll();
        } catch {
            userMsg = 'Network error, please try again';
        }
    }
</script>

<div class="mx-auto max-w-2xl p-4">
    <div class="mb-6 flex flex-col space-y-2">
        <h1 class="text-xl font-medium text-gray-900 dark:text-white">Settings</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
            Current user: <span class="font-medium">{me.username}</span>
            {#if me.isAdmin}<span
                    class="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >Admin</span
                >{/if}
        </p>
    </div>

    <div class="flex flex-col space-y-6">
        <Card class="w-full max-w-none p-4 sm:p-6 md:p-8">
            <form
                class="flex flex-col space-y-6"
                onsubmit={(e) => {
                    e.preventDefault();
                    savePreset();
                }}
            >
                <h2 class="text-xl font-medium text-gray-900 dark:text-white">Transcoding tier</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    Web playback always uses transcoding. If the source bitrate is already below the selected tier, the source stream is used directly instead of pointless transcoding.
                </p>
                <Label class="space-y-2">
                    <span>Tier</span>
                    <Select bind:value={preset} disabled={presetLoading}>
                        {#each TIER_OPTIONS as opt (opt.name)}
                            <option value={opt.name}>{opt.label} ({opt.desc})</option>
                        {/each}
                    </Select>
                </Label>
                {#if presetMsg}<p class="text-sm text-gray-500 dark:text-gray-400">
                        {presetMsg}
                    </p>{/if}
                <Button type="submit" color="primary" disabled={presetLoading}>Save</Button>
            </form>
        </Card>

        <Card class="w-full max-w-none p-4 sm:p-6 md:p-8">
            <form
                class="flex flex-col space-y-6"
                onsubmit={(e) => {
                    e.preventDefault();
                    updateUsername();
                }}
            >
                <h2 class="text-xl font-medium text-gray-900 dark:text-white">Change username</h2>
                <Label class="space-y-2">
                    <span>Username</span>
                    <Input type="text" bind:value={usernameInput} disabled={unLoading} />
                </Label>
                {#if unMsg}<p class="text-sm {unOk ? 'text-green-600' : 'text-red-500'}">
                        {unMsg}
                    </p>{/if}
                <Button type="submit" color="primary" disabled={unLoading}>Save</Button>
            </form>
        </Card>

        <Card class="w-full max-w-none p-4 sm:p-6 md:p-8">
            <form
                class="flex flex-col space-y-6"
                onsubmit={(e) => {
                    e.preventDefault();
                    changePassword();
                }}
            >
                <h2 class="text-xl font-medium text-gray-900 dark:text-white">Change password</h2>
                <Label class="space-y-2">
                    <span>Current password</span>
                    <Input type="password" bind:value={oldPassword} disabled={pwLoading} />
                </Label>
                <Label class="space-y-2">
                    <span>New password</span>
                    <Input type="password" bind:value={newPassword} disabled={pwLoading} />
                </Label>
                <Label class="space-y-2">
                    <span>Confirm new password</span>
                    <Input type="password" bind:value={confirmPassword} disabled={pwLoading} />
                </Label>
                {#if pwMsg}<p class="text-sm {pwOk ? 'text-green-600' : 'text-red-500'}">
                        {pwMsg}
                    </p>{/if}
                <Button type="submit" color="primary" disabled={pwLoading}>Change password</Button>
            </form>
        </Card>

        {#if me.isAdmin}
            <Card class="w-full max-w-none p-4 sm:p-6 md:p-8">
                <div class="flex flex-col space-y-6">
                    <h2 class="text-xl font-medium text-gray-900 dark:text-white">User management</h2>
                    <div class="flex flex-col space-y-2">
                        {#each users as u (u.id)}
                            <div
                                class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                            >
                                <span class="text-sm font-medium text-gray-900 dark:text-white"
                                    >{u.username}</span
                                >
                                {#if u.id === 1}
                                    <Button size="xs" color="light" disabled>Admin</Button>
                                {:else}
                                    <Button
                                        size="xs"
                                        color="red"
                                        onclick={() => deleteUser(u.id, u.username)}>Delete</Button
                                    >
                                {/if}
                            </div>
                        {/each}
                    </div>
                    <form
                        class="flex flex-col space-y-6"
                        onsubmit={(e) => {
                            e.preventDefault();
                            addUser();
                        }}
                    >
                        <h3 class="text-base font-medium text-gray-900 dark:text-white">
                            Add user
                        </h3>
                        <Label class="space-y-2">
                            <span>Username</span>
                            <Input type="text" bind:value={newUsername} disabled={userLoading} />
                        </Label>
                        <Label class="space-y-2">
                            <span>Password</span>
                            <Input
                                type="text"
                                bind:value={newUserPassword}
                                disabled={userLoading}
                            />
                        </Label>
                        {#if userMsg}<p class="text-sm text-red-500">{userMsg}</p>{/if}
                        <Button type="submit" color="primary" disabled={userLoading}>Add</Button>
                    </form>
                </div>
            </Card>
        {/if}
    </div>
</div>
