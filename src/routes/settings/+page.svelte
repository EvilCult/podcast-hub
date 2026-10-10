<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { Button, Card, Input, Label, Select } from 'flowbite-svelte';

    import { TIER_OPTIONS, isTierName } from '$lib/tiers';
    import type { MeInfo, UserListItem } from './+page';

    let { data } = $props();
    let me: MeInfo = $derived(data.me);
    let users: UserListItem[] = $derived(data.users);

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
            pwMsg = '请填写原密码和新密码';
            return;
        }
        if (newPassword !== confirmPassword) {
            pwMsg = '两次输入的新密码不一致';
            return;
        }
        pwLoading = true;
        try {
            const res = await fetch('/api/auth/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                pwMsg = body.error ?? '修改失败';
                return;
            }
            pwOk = true;
            pwMsg = '密码修改成功';
            oldPassword = '';
            newPassword = '';
            confirmPassword = '';
        } catch {
            pwMsg = '网络错误，请重试';
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
            presetMsg = '档位无效';
            return;
        }
        presetLoading = true;
        try {
            const res = await fetch('/api/user/preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preset })
            });
            const body = await res.json().catch(() => ({}));
            presetMsg = res.ok ? '已保存，新播放的节目生效' : (body.error ?? '保存失败');
        } catch {
            presetMsg = '网络错误，请重试';
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
            userMsg = '请输入用户名和密码';
            return;
        }
        userLoading = true;
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername.trim(), password: newUserPassword })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                userMsg = body.error ?? '添加失败';
                return;
            }
            newUsername = '';
            newUserPassword = '';
            await invalidateAll();
        } catch {
            userMsg = '网络错误，请重试';
        } finally {
            userLoading = false;
        }
    }

    async function deleteUser(id: number, username: string) {
        if (!confirm(`确定删除用户 ${username} 吗？他的历史和收藏会一并删除。`)) return;
        userMsg = '';
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                userMsg = body.error ?? '删除失败';
                return;
            }
            await invalidateAll();
        } catch {
            userMsg = '网络错误，请重试';
        }
    }
</script>

<div class="mx-auto max-w-2xl p-4">
    <div class="mb-6 flex flex-col space-y-2">
        <h1 class="text-xl font-medium text-gray-900 dark:text-white">设置</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
            当前用户：<span class="font-medium">{me.username}</span>
            {#if me.isAdmin}<span
                    class="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >管理员</span
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
                <h2 class="text-xl font-medium text-gray-900 dark:text-white">转码档位</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    Web 播放全部走转码。若源文件码率已低于所选档位，则直接使用源流，不做无用转码。
                </p>
                <Label class="space-y-2">
                    <span>档位</span>
                    <Select bind:value={preset} disabled={presetLoading}>
                        {#each TIER_OPTIONS as opt}
                            <option value={opt.name}>{opt.label}（{opt.desc}）</option>
                        {/each}
                    </Select>
                </Label>
                {#if presetMsg}<p class="text-sm text-gray-500 dark:text-gray-400">{presetMsg}</p>{/if}
                <Button type="submit" color="primary" disabled={presetLoading}>保存</Button>
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
                <h2 class="text-xl font-medium text-gray-900 dark:text-white">修改密码</h2>
                <Label class="space-y-2">
                    <span>原密码</span>
                    <Input type="password" bind:value={oldPassword} disabled={pwLoading} />
                </Label>
                <Label class="space-y-2">
                    <span>新密码</span>
                    <Input type="password" bind:value={newPassword} disabled={pwLoading} />
                </Label>
                <Label class="space-y-2">
                    <span>确认新密码</span>
                    <Input type="password" bind:value={confirmPassword} disabled={pwLoading} />
                </Label>
                {#if pwMsg}<p class="text-sm {pwOk ? 'text-green-600' : 'text-red-500'}">{pwMsg}</p>{/if}
                <Button type="submit" color="primary" disabled={pwLoading}>修改密码</Button>
            </form>
        </Card>

        {#if me.isAdmin}
            <Card class="w-full max-w-none p-4 sm:p-6 md:p-8">
                <div class="flex flex-col space-y-6">
                    <h2 class="text-xl font-medium text-gray-900 dark:text-white">用户管理</h2>
                    <div class="flex flex-col space-y-2">
                        {#each users as u}
                            <div
                                class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                            >
                                <span class="text-sm font-medium text-gray-900 dark:text-white">{u.username}</span>
                                {#if u.id === 1}
                                    <Button size="xs" color="light" disabled>管理员</Button>
                                {:else}
                                    <Button size="xs" color="red" onclick={() => deleteUser(u.id, u.username)}
                                        >删除</Button
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
                        <h3 class="text-base font-medium text-gray-900 dark:text-white">添加用户</h3>
                        <Label class="space-y-2">
                            <span>用户名</span>
                            <Input type="text" bind:value={newUsername} disabled={userLoading} />
                        </Label>
                        <Label class="space-y-2">
                            <span>密码</span>
                            <Input type="text" bind:value={newUserPassword} disabled={userLoading} />
                        </Label>
                        {#if userMsg}<p class="text-sm text-red-500">{userMsg}</p>{/if}
                        <Button type="submit" color="primary" disabled={userLoading}>添加</Button>
                    </form>
                </div>
            </Card>
        {/if}
    </div>
</div>
