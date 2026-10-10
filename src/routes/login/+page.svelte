<script lang="ts">
    import { goto } from '$app/navigation';
    import { Button, Card, Input, Label } from 'flowbite-svelte';

    let username = $state('');
    let password = $state('');
    let loading = $state(false);
    let errorMsg = $state('');

    async function login() {
        if (!username.trim() || !password) {
            errorMsg = '请输入用户名和密码';
            return;
        }
        loading = true;
        errorMsg = '';
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                errorMsg = data.error ?? '登录失败';
                return;
            }
            await goto('/');
        } catch {
            errorMsg = '网络错误，请重试';
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex min-h-[70vh] items-center justify-center px-4">
    <Card class="w-full max-w-sm">
        <h1 class="mb-6 text-center text-xl font-semibold text-gray-900 dark:text-white">
            PodCast Streaming Proxy
        </h1>
        <form
            onsubmit={(e) => {
                e.preventDefault();
                login();
            }}
            class="flex flex-col gap-4"
        >
            <div>
                <Label for="username" class="mb-2">用户名</Label>
                <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    bind:value={username}
                    disabled={loading}
                    autocomplete="username"
                />
            </div>
            <div>
                <Label for="password" class="mb-2">密码</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    bind:value={password}
                    disabled={loading}
                    autocomplete="current-password"
                />
            </div>
            {#if errorMsg}
                <p class="text-sm text-red-500">{errorMsg}</p>
            {/if}
            <Button type="submit" color="primary" disabled={loading} class="w-full">
                {loading ? '登录中…' : '登录'}
            </Button>
        </form>
    </Card>
</div>
