import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export interface MeInfo {
    id: number;
    username: string;
    isAdmin: boolean;
    tr_preset: string;
}

export interface UserListItem {
    id: number;
    username: string;
    tr_preset: string;
    created_at: number;
}

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
        throw redirect(303, '/login');
    }
    const me = (await res.json()) as MeInfo;
    let users: UserListItem[] = [];
    if (me.isAdmin) {
        const ures = await fetch('/api/users');
        if (ures.ok) {
            users = ((await ures.json()).data ?? []) as UserListItem[];
        }
    }
    return { me, users };
};
