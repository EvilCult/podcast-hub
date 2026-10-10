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

<div class="mx-auto flex max-w-2xl flex-col gap-6 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-white">设置</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400">
        当前用户：<span class="font-medium">{me.username}</span>
        {#if me.isAdmin}<span class="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">管理员</span>{/if}
    </p>

    <Card class="w-full max-w-none">
        <h2 class="mb-4 text-base font-medium text-gray-900 dark:text-white">转码档位</h2>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Web 播放全部走转码。若源文件码率已低于所选档位，则直接使用源流，不做无用转码。
        </p>
        <div class="flex flex-col gap-4">
            <div>
                <Label for="preset" class="mb-2">档位</Label>
                <Select id="preset" bind:value={preset} disabled={presetLoading}>
                    {#each TIER_OPTIONS as opt}
                        <option value={opt.name}>{opt.label}（{opt.desc}）</option>
                    {/each}
                </Select>
            </div>
            {#if presetMsg}<p class="text-sm text-gray-500 dark:text-gray-400">{presetMsg}</p>{/if}
            <div><Button color="primary" onclick={savePreset} disabled={presetLoading}>保存</Button></div>
        </div>
    </Card>

    <Card class="w-full max-w-none">
        <h2 class="mb-4 text-base font-medium text-gray-900 dark:text-white">修改密码</h2>
        <div class="flex flex-col gap-4">
            <div>
                <Label for="oldpw" class="mb-2">原密码</Label>
                <Input id="oldpw" type="password" bind:value={oldPassword} disabled={pwLoading} />
            </div>
            <div>
                <Label for="newpw" class="mb-2">新密码</Label>
                <Input id="newpw" type="password" bind:value={newPassword} disabled={pwLoading} />
            </div>
            <div>
                <Label for="confirmpw" class="mb-2">确认新密码</Label>
                <Input id="confirmpw" type="password" bind:value={confirmPassword} disabled={pwLoading} />
            </div>
            {#if pwMsg}<p class="text-sm {pwOk ? 'text-green-600' : 'text-red-500'}">{pwMsg}</p>{/if}
            <div><Button color="primary" onclick={changePassword} disabled={pwLoading}>修改密码</Button></div>
        </div>
    </Card>

    {#if me.isAdmin}
        <Card class="w-full max-w-none">
            <h2 class="mb-4 text-base font-medium text-gray-900 dark:text-white">用户管理</h2>
            <div class="mb-6 flex flex-col gap-2">
                {#each users as u}
                    <div class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-700">
                        <div class="text-sm">
                            <span class="font-medium text-gray-900 dark:text-white">{u.username}</span>
                            <span class="ml-2 text-gray-500 dark:text-gray-400">id={u.id}</span>
                            {#if u.id === 1}<span class="ml-2 text-xs text-amber-600">管理员</span>{/if}
                        </div>
                        {#if u.id !== 1}
                            <Button size="xs" color="red" onclick={() => deleteUser(u.id, u.username)}>删除</Button>
                        {/if}
                    </div>
                {/each}
            </div>
            <h3 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">添加用户</h3>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div class="flex-1">
                    <Label for="newuser" class="mb-2">用户名</Label>
                    <Input id="newuser" type="text" bind:value={newUsername} disabled={userLoading} />
                </div>
                <div class="flex-1">
                    <Label for="newuserpw" class="mb-2">密码</Label>
                    <Input id="newuserpw" type="text" bind:value={newUserPassword} disabled={userLoading} />
                </div>
                <div><Button color="primary" onclick={addUser} disabled={userLoading}>添加</Button></div>
            </div>
            {#if userMsg}<p class="mt-2 text-sm text-red-500">{userMsg}</p>{/if}
        </Card>
    {/if}
</div>
