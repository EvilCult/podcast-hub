# 🔌 API Reference

[中文版](./API_DOCS_CN.md) · [README](../README.md)

### Podcasts

- **GET** `/api/radio` — List subscriptions.
- **POST** `/api/radio` — Subscribe. Body: `{ "url": "https://..." }` (RSS feed or Apple Podcasts link).
- **DELETE** `/api/radio/[id]` — Unsubscribe; also deletes all episodes of that podcast.
- **GET** `/api/radio/[id]/episodes?p=1&ps=10` — Paginated episode list (`p` = page, default 1; `ps` = page size, default 5).

### Playback progress & favorites

- **GET / POST** `/api/episode/[id]/history` — Get / update playback position. Body: `{ "pos": 120 }` (seconds).
- **GET** `/api/history` — Playback history list.
- **GET / PUT / DELETE** `/api/fav` — Favorites (see route for the exact body shape).

### Proxy & transcode

- **GET** `/api/audio?url=<encoded_url>` — Proxied audio with `Range` support.
- **GET** `/api/image?url=<encoded_url>` — Proxied cover art with browser caching.
- **GET** `/api/transcode?url=<encoded_url>&pos=<seconds>&duration=<seconds>` — Real-time MP3 transcoding. Logged-in users get their saved tier; anonymous requests must pass explicit `sr` (8000–48000), `br` (16–320), `ch` (1–2) parameters (device mode), otherwise `401`.
- **GET / POST** `/api/refresh` — Re-fetch all subscribed feeds now.

### FlatAPI (device clients, no auth)

- **GET** `/flatapi/radio` — Flat subscription list; each item links to its episode list.
- **GET** `/flatapi/radio/[id]/episodes?p=1&ps=5` — Episodes with audio URLs wrapped in the device transcode profile. Includes `&pos=<seconds>` when a saved position exists.
- **GET** `/flatapi/radio/sp/fav?p=1&ps=5` and `/flatapi/radio/sp/history?p=1&ps=5` — The admin's favorites and history, same URL wrapping.
- **GET** `/flatapi/transcode?url=<encoded_url>&pos=<seconds>` — Device-profile transcode endpoint (32 kHz / 48 kbps / mono), independent of web login.

---
