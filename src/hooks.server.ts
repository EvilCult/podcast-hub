import { setupProxy } from '$lib/server/proxy';

// Runs once at server startup (dev / preview / node build / docker).
// Honors PROXY_URL (or standard *_proxy env); empty = direct, no behavior change.
setupProxy();
