<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { Button, Card, Input, Label } from 'flowbite-svelte';
    import { PUBLIC_HOST } from '$env/static/public';

    let username = $state('');
    let password = $state('');
    let loading = $state(false);
    let errorMsg = $state('');

    async function login() {
        if (!username.trim() || !password) {
            errorMsg = 'Enter your username and password';
            return;
        }
        loading = true;
        errorMsg = '';
        try {
            const res = await fetch(`${PUBLIC_HOST}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                errorMsg = data.error ?? 'Sign-in failed';
                return;
            }
            await goto(resolve('/'));
        } catch {
            errorMsg = 'Network error, please try again';
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex min-h-[70vh] items-center justify-center px-4">
    <Card class="w-full max-w-sm p-4 sm:p-6 md:p-8">
        <form
            class="flex flex-col space-y-6"
            onsubmit={(e) => {
                e.preventDefault();
                login();
            }}
        >
            <h1 class="text-xl font-medium text-gray-900 dark:text-white">Sign in to PodCast Hub</h1>
            <Label class="space-y-2">
                <span>Username</span>
                <Input
                    type="text"
                    placeholder="admin"
                    bind:value={username}
                    disabled={loading}
                    autocomplete="username"
                />
            </Label>
            <Label class="space-y-2">
                <span>Password</span>
                <Input
                    type="password"
                    placeholder="••••••••"
                    bind:value={password}
                    disabled={loading}
                    autocomplete="current-password"
                />
            </Label>
            {#if errorMsg}
                <p class="text-sm text-red-500">{errorMsg}</p>
            {/if}
            <Button type="submit" color="primary" disabled={loading} class="w-full">
                {loading ? 'Signing in…' : 'Sign in'}
            </Button>
        </form>
    </Card>
</div>
