# 01 — PRD (Product Requirements)

**Product:** Hearthreel — a fast, clean web app (PWA) for watching your own media server.
**Status:** Session 2 (staging only). **Last updated:** 2026-11-08.

## Problem
People who run a personal media server (Jellyfin, Plex, Emby) want a client that feels faster and cleaner than the official one, works on any device with a browser, and can be "installed" like an app.

## Who it is for
- **Home-server owner:** runs Jellyfin on a NAS/PC, already has HTTPS through a reverse proxy or tunnel.
- **Family member:** gets a username from the owner, just wants to press play.

## Demand evidence (proxies, not revenue)
Reference app (Plezy, App Store, checked 2026-11-07): $5.99 paid + $3.99 one-time supporter IAP, 4.5★ from 122 ratings, updated ~4 days before the check. These show people pay for a better client. App stores do not show revenue; we do not claim any.

## Goals for Session 1
1. Connect to one Jellyfin server with username + password.
2. Browse libraries and search.
3. Play a video, resume where you left off, and save progress back to the server.
4. Installable PWA with an offline app shell, deployed to a **staging** URL.

## Goals for Session 2 (Gate 2 twist, all approved)
5. Couch mode (TV layout + remote navigation) and a player that keeps playing while you browse.
6. Quality picker (Original / 1080p / 720p / 480p), remembered per server.
7. "Tonight" watch-later shelf with Play next / Up next.
8. Several saved accounts on one device ("Who's watching?") and sign-in with a code (Quick Connect).

## Non-goals (still out)
Plex/Emby, offline downloads, Live TV/DVR, our own accounts or backend, payments, production deploy, a native visionOS app.
(Multiple accounts and Quick Connect moved from non-goals to Session 2 goals.)

## Success criteria
- All flows above work against a real Jellyfin server (10.9 or newer).
- `npm run build` passes with no type or lint errors.
- Staging URL loads, installs, and registers a service worker.

## Twist (approved at Gate 2)
All three candidates plus saved accounts and code sign-in. See `docs/03-twist.md`, including the **Delta from reference** table.

## Monetization (later, not Session 1)
Candidate: one-time "supporter" unlock for themes. No subscriptions.
