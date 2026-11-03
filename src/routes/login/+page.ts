import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { PUBLIC_HOST } from '$env/static/public';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch(`${PUBLIC_HOST}/api/auth/me`).catch(() => null);
    if (res?.ok) {
        throw redirect(303, '/');
    }
    return {};
};
