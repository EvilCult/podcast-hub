import { json } from '@sveltejs/kit';

import { post } from './post';

export async function GET() {
    return json({
        message: 'hello'
    });
}

export const POST = post;
