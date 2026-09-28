import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { fetchFeed } from '$lib/server/rss';
import { createRadio } from '$lib/server/repos/radio';
import { createEpisode } from '$lib/server/repos/episode';

export const post: RequestHandler = async ({ request }) => {
    const data = await request.json();

    const podcastUrl = data.url as string;
    let feedUrl;

    if (podcastUrl.includes('podcasts.apple.com')) {
        // 1. 从 Apple Podcast URL 提取 country 和 id
        const url = new URL(podcastUrl);

        const country = url.pathname.split('/')[1];
        const match = url.pathname.match(/\/id(\d+)/);

        if (!match) {
            return json({ error: 'Invalid Apple Podcast URL' }, { status: 400 });
        }

        const podcastId = match[1];

        // 2. 请求 Apple iTunes API
        const lookupUrl = `https://itunes.apple.com/lookup?id=${podcastId}&country=${country}`;

        const lookupResponse = await fetch(lookupUrl);

        if (!lookupResponse.ok) {
            return json({ error: 'Apple iTunes API request failed' }, { status: 502 });
        }

        const lookupData = await lookupResponse.json();

        if (lookupData.resultCount === 0) {
            return json({ error: 'Podcast not found' }, { status: 404 });
        }

        const podcast = lookupData.results[0];

        // 3. 从 Apple API 得到真正的 RSS URL
        feedUrl = podcast.feedUrl;
    } else {
        feedUrl = podcastUrl;
    }

    // 4. 请求并解析 RSS
    let parsed;
    try {
        parsed = await fetchFeed(feedUrl);
    } catch (e) {
        return json({ error: `RSS feed request failed: ${(e as Error).message}` }, { status: 502 });
    }

    // 5.插入数据库的radios表和episodes表
    const radioId = createRadio({
        title: parsed.channel.title,
        cover: parsed.channel.image ?? null,
        digest: parsed.channel.digest,
        feed: feedUrl,
        resource: null,
        last_update: Math.floor(Date.now() / 1000)
    });

    for (const episode of parsed.episodes) {
        createEpisode({
            title: episode.title,
            digest: episode.digest,
            url: episode.url ?? null,
            radio_id: radioId,
            duration: episode.duration,
            pub_date: episode.pubDate
        });
    }

    return json({
        radioId,
        episodeCount: parsed.episodes.length
    });
};
