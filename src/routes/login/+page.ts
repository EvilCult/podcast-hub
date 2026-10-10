import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('/api/auth/me').catch(() => null);
    if (res?.ok) {
        throw redirect(303, '/');
    }
    return {};
};
