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
- [x] `staging` branch pushed
- [ ] Vercel staging deploy + smoke test — **blocked**: Vercel 403 on project create (`docs/05-deploy.md`)

## Phase 6 — Gate 2
- [x] User picked **all three** twists, then added saved accounts + code sign-in

## Phase 7 — Twist build (Session 2)
- [x] `src/playback/engine.ts`: Session 1 player logic moved out of the page
- [x] `PlaybackProvider`: one `<video>` above the routes; full ↔ mini without restart; browser PiP; stop on route leave unless minimized
- [x] Couch mode: `spatial.ts` scoring, `CouchNav` (arrows, row memory, page memory), TV auto-detect, 10-foot CSS
- [x] Quality menu: bitrate + `Height` profile rule, saved per server, restart at the same second
- [x] Tonight: list helpers, per-user storage, `/Items?ids=` refresh, Play next, Up next countdown, auto-remove on finish
- [x] Saved accounts: `accounts` list + migration, Who's watching?, Your account page, server-side logout
- [x] Quick Connect: code screen + polling on `/connect`, approve form on `/me`
- [x] Unit tests (34) and e2e (29 checks) against Jellyfin 12.4.0
- [x] Docs: twist decision + delta from reference, TRD/flow/brief/schema, review

## Later phases (not this session)
Staging deploy (still blocked, see `05-deploy.md`) → production (Gate 3) → Plex/Emby → offline downloads → supporter themes.
