import { json } from '@sveltejs/kit';
import { fetchFeed, type FeedEpisode } from '$lib/server/rss';
import { getRefreshTargets, updateRadio } from '$lib/server/repos/radio';
import { createEpisode, getEpisodeKeys } from '$lib/server/repos/episode';

type RadioResult = {
    radio_id: number;
    title: string;
    added: number;
    skipped: number;
    total: number;
    error?: string;
};

function isDuplicate(
    ep: FeedEpisode,
    urls: Set<string>,
    titleDates: Set<string>
): boolean {
    if (ep.url && urls.has(ep.url)) {
        return true;
    }
    if (titleDates.has(`${ep.title}|${ep.pubDate}`)) {
        return true;
    }
    return false;
}

async function refreshOne(
    radio_id: number,
    title: string,
    feed: string
): Promise<RadioResult> {
    const result: RadioResult = { radio_id, title, added: 0, skipped: 0, total: 0 };

    const parsed = await fetchFeed(feed);
    result.total = parsed.episodes.length;

    const existing = getEpisodeKeys(radio_id);
    const urls = new Set(existing.map((e) => e.url).filter((u): u is string => !!u));
    const titleDates = new Set(existing.map((e) => `${e.title}|${e.pub_date}`));

    for (const ep of parsed.episodes) {
        if (isDuplicate(ep, urls, titleDates)) {
            result.skipped++;
            continue;
        }
        createEpisode({
            title: ep.title,
            digest: ep.digest,
            url: ep.url ?? null,
            radio_id,
            duration: ep.duration,
            pub_date: ep.pubDate
        });
        result.added++;
        // keep the in-memory sets in sync in case the feed lists an episode twice
        if (ep.url) urls.add(ep.url);
        titleDates.add(`${ep.title}|${ep.pubDate}`);
    }

    updateRadio(radio_id, { last_update: Math.floor(Date.now() / 1000) });

    return result;
}

export async function runRefresh() {
    const targets = getRefreshTargets();

    const refreshed: RadioResult[] = [];

    // Sequential: polite to feed hosts, and keeps the sqlite writes simple.
    for (const t of targets) {
        try {
            refreshed.push(await refreshOne(t.id, t.title, t.feed));
        } catch (e) {
            refreshed.push({
                radio_id: t.id,
                title: t.title,
                added: 0,
                skipped: 0,
                total: 0,
                error: (e as Error).message
            });
        }
    }

    return json({
        refreshed,
        summary: {
            radios: refreshed.length,
            added: refreshed.reduce((n, r) => n + r.added, 0),
            errors: refreshed.filter((r) => r.error).length
        }
    });
}

