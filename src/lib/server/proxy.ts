import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Route all server-side `fetch()` through an optional proxy.
 *
 * Env:
 *   PROXY_URL            the single switch, three cases:
 *                          "" (empty/unset) -> direct (default)
 *                          "socks5://host:port" (or any proxy URL)
 *                            -> use it directly
 *                          "https_proxy" (or http_proxy / all_proxy,
 *                          case-insensitive) -> indirection: read that env
 *                          var's value and use it as the proxy URL, so the
 *                          URL isn't duplicated in compose.
 *                        "empty = direct" stays unambiguous: standard
 *                        *_proxy vars are never consulted unless explicitly
 *                        named via the indirection keyword.
 *   no_proxy / NO_PROXY  honored for bypass (hostnames, wildcards, ports;
 *                        note: undici does not support CIDR entries).
 *
 * Notes:
 *   - undici sends the raw hostname to a SOCKS5 proxy (ATYP 0x03), i.e. DNS
 *     is resolved remotely by the proxy -- equivalent to curl's `socks5h://`.
 *     This dodges polluted local DNS (e.g. *.cloudfront.net returning
 *     AAAA-only). A curl-style `socks5h://` value is normalized to
 *     `socks5://` because undici doesn't recognize the `h` variant (it
 *     would be misread as an HTTP proxy).
 *   - SvelteKit's `event.fetch` delegates external origins to the global
 *     fetch, so one global dispatcher covers iTunes lookup, RSS feeds,
 *     /api/image and /api/audio without touching any call site.
 */
const PROXY_ENV_KEYS = ['http_proxy', 'https_proxy', 'all_proxy'];

export function resolveProxyUrl(env: NodeJS.ProcessEnv = process.env): string {
    const raw = env.PROXY_URL?.trim() || '';

    if (!raw) return '';

    // Indirection keyword: PROXY_URL=https_proxy -> use $https_proxy's value.
    const key = raw.toLowerCase();
    if (PROXY_ENV_KEYS.includes(key)) {
        const resolved = env[key]?.trim() || env[key.toUpperCase()]?.trim() || '';
        if (!resolved) {
            console.warn(`[proxy] PROXY_URL=${raw} but ${key} is not set, falling back to direct`);
            return '';
        }
        return normalizeProxyUrl(resolved);
    }

    return normalizeProxyUrl(raw);
}

function normalizeProxyUrl(url: string): string {
    return url.replace(/^socks5h:\/\//i, 'socks5://');
}

export function setupProxy(env: NodeJS.ProcessEnv = process.env): void {
    const url = resolveProxyUrl(env);

    if (!url) {
        console.log('[proxy] not configured, outbound requests go direct');
        return;
    }

    try {
        setGlobalDispatcher(new EnvHttpProxyAgent({ httpProxy: url, httpsProxy: url }));
        console.log(`[proxy] outbound requests via ${maskAuth(url)} (no_proxy honored)`);
    } catch (err) {
        console.error('[proxy] invalid proxy URL, falling back to direct:', err);
    }
}

function maskAuth(url: string): string {
    return url.replace(/:\/\/[^@/]+@/, '://***@');
}
