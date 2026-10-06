import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Route all server-side `fetch()` through an optional proxy.
 *
 * Env:
 *   PROXY_URL            dedicated switch, e.g. "socks5://172.22.1.1:20170".
 *                        Falls back to the standard http_proxy/https_proxy/
 *                        all_proxy (either case) when unset.
 *   no_proxy / NO_PROXY  honored for bypass (hostnames, wildcards, ports;
 *                        note: undici does not support CIDR entries).
 *
 * Behavior:
 *   - empty / unset -> do nothing, everything stays direct (default).
 *   - set           -> every server-side fetch goes through the proxy.
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
export function resolveProxyUrl(env: NodeJS.ProcessEnv = process.env): string {
    const raw =
        env.PROXY_URL?.trim() ||
        env.HTTPS_PROXY?.trim() ||
        env.https_proxy?.trim() ||
        env.HTTP_PROXY?.trim() ||
        env.http_proxy?.trim() ||
        env.ALL_PROXY?.trim() ||
        env.all_proxy?.trim() ||
        '';

    if (!raw) return '';

    return raw.replace(/^socks5h:\/\//i, 'socks5://');
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
