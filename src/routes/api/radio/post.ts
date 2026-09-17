process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';
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

    // 4. 请求 RSS
    const feedResponse = await fetch(feedUrl);

    if (!feedResponse.ok) {
        return json({ error: 'RSS feed request failed' }, { status: 502 });
    }

    const xml = await feedResponse.text();

    // 5. XML → JavaScript object
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
    });

    const feed = parser.parse(xml);

    const channel = feed.rss.channel;

    // 6. radios 表需要的数据
    const radio = {
        title: channel.title,
        description: channel.description,
        image: channel['itunes:image']['@_href'],
        url: feedUrl
    };

    // 7. episodes 表
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];

    const episodes = items.map(
        (item: {
            title: string;
            description: string;
            enclosure: {
                '@_url': string;
            };
            'itunes:duration': string | null;
            pubDate: string;
        }) => ({
            title: item.title,
            digest: rmHtml(item.description),
            url: item.enclosure?.['@_url'],
            duration: fixDuration(item['itunes:duration']),
            pubDate: Math.floor(new Date(item.pubDate).getTime() / 1000)
        })
    );

    // 8.插入数据库的raidos表和episodes表
    const radioId = createRadio({
        title: radio.title,
        cover: radio.image,
        digest: radio.description,
        feed: radio.url,
        resource: null,
        last_update: Math.floor(Date.now() / 1000)
    });

    for (const episode of episodes) {
        createEpisode({
            title: episode.title,
            digest: episode.digest,
            url: episode.url,
            radio_id: radioId,
            duration: episode.duration,
            pub_date: episode.pubDate
        });
    }

    return json({
        radioId,
        episodeCount: episodes.length
    });
};

function rmHtml(html: string): string {
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function fixDuration(duration: string | null): number {
    if (duration === null) {
        return 0;
    }
    if (typeof duration === 'number') {
        return duration;
    }
    if (!duration.includes(':')) {
        return Number(duration);
    }
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    }
    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
    }
    return 0;
}
