process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { XMLParser } from 'fast-xml-parser';

export type FeedEpisode = {
    title: string;
    digest: string;
    url: string | undefined;
    duration: number;
    /** unix seconds */
    pubDate: number;
};

export type FeedChannel = {
    title: string;
    digest: string;
    image: string | undefined;
};

export type ParsedFeed = {
    channel: FeedChannel;
    episodes: FeedEpisode[];
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

type RawItem = {
    title?: string;
    description?: string;
    enclosure?: { '@_url'?: string };
    'itunes:duration'?: string | number | null;
    pubDate?: string;
};

function asArray<T>(v: T | T[] | undefined): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

/** Fetch an RSS feed and normalize its channel + items. Throws on HTTP/parse errors. */
export async function fetchFeed(feedUrl: string): Promise<ParsedFeed> {
    const feedResponse = await fetch(feedUrl);

    if (!feedResponse.ok) {
        throw new Error(`RSS feed request failed: ${feedResponse.status}`);
    }

    const xml = await feedResponse.text();
    const feed = parser.parse(xml);
    const channel = feed?.rss?.channel;

    if (!channel) {
        throw new Error('Not an RSS feed: missing rss.channel');
    }

    const items = asArray<RawItem>(channel.item).map((item) => ({
        title: item.title ?? '',
        digest: rmHtml(item.description ?? ''),
        url: item.enclosure?.['@_url'],
        duration: fixDuration(item['itunes:duration'] ?? null),
        pubDate: Math.floor(new Date(item.pubDate ?? 0).getTime() / 1000)
    }));

    return {
        channel: {
            title: channel.title ?? '',
            digest: rmHtml(channel.description ?? ''),
            image: channel['itunes:image']?.['@_href']
        },
        episodes: items
    };
}

export function rmHtml(html: unknown): string {
    const text = typeof html === 'string' ? html : nodeText(html);
    return text
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

/** Extract inner text from a parsed XML node (attributes skipped). */
function nodeText(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (Array.isArray(v)) return v.map(nodeText).join(' ');
    if (typeof v === 'object') {
        return Object.entries(v as Record<string, unknown>)
            .filter(([k]) => !k.startsWith('@_'))
            .map(([, val]) => nodeText(val))
            .join(' ');
    }
    return '';
}

export function fixDuration(duration: string | number | null): number {
    if (duration === null || duration === undefined) {
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
    return Number(duration) || 0;
}
