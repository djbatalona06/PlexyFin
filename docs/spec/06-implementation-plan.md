# 06 — Implementation Plan

## Phase 0 — Paper (done first)
- [x] 6 docs + `docs/ip-check.md` + `docs/server-setup.md`
- [x] Risks checked: mixed content, CORS, codecs, IP

## Phase 1 — Skeleton
- [x] Vite + React + TS scaffold, ESLint
- [x] `vite-plugin-pwa`: manifest, icons, `generateSW`, navigate fallback
- [x] Theme tokens, layout shell, hash router

## Phase 2 — Connect
- [x] `src/api/storage.ts` (IndexedDB session + deviceId)
- [x] `src/api/jellyfin.ts` (auth header, fetch wrapper, error types)
- [x] `/connect` page with mixed-content check and clear errors

## Phase 3 — Browse + search
- [x] Home (Continue watching + libraries), Library, Search, Item pages
- [x] Poster card with progress bar

## Phase 4 — Play
- [x] Device profile from browser codec checks
- [x] PlaybackInfo → direct stream or HLS (hls.js / native)
- [x] Resume at saved position; report start/progress (every 10 s, on pause/seek)/stopped
- [x] "Try converting" fallback; stop transcode on exit

## Phase 5 — Quality + staging
- [x] Unit tests for pure helpers (ticks, auth header, URL rules, device profile)
- [x] End-to-end smoke test against a real Jellyfin 12.4 server (`npm run e2e`)
- [x] `npm run lint && npm run build`
- [x] `docs/04-review.md`
- [ ] Vercel staging deploy + smoke test (`docs/05-deploy.md`)

## Phase 6 — Gate 2 (stop)
- [ ] User picks a twist from `docs/03-twist.md`

## Later phases (not this session)
Twist build → production (Gate 3) → Plex/Emby → offline downloads → supporter themes.
