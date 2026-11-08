# 04 — Bug Review (Session 1)

**Date:** 2026-11-07. **Result:** no open high-severity items.

## Checks run
| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` / `npm run build` | Pass |
| `npm test` (Vitest, 12 tests) | Pass |
| `npm run e2e` against real **Jellyfin 12.4.0** (Docker) in Chromium 153 | **15/15 pass**: shell loads, manifest valid, service worker registers, log in, libraries, library items, search, direct play, progress reported, stop reported, resume button, resume position, position saved on server, converted HLS playback, app opens offline |
| Forced direct-play failure → "Try converting" | Pass: message shown, converted stream plays |
| Wrong password / unreachable server messages | Pass: "Wrong username or password." / "Can't reach the server…" |
| Phone (iPhone 13) + desktop layout, no sideways scroll | Pass (after fixes below) |

## Findings
| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **High** | Jellyfin 12 returns camelCase JSON when the browser sends `Accept: */*` → login would fail ("doesn't look like a Jellyfin server") | **Fixed**: send `Accept: application/json; profile="PascalCase"` |
| 2 | **High** | Stale-chunk crash: the service worker activates new versions immediately (`skipWaiting`); an open tab could then fail to load a page's code file → blank screen | **Fixed**: `lazyPage()` reloads once to get the new version |
| 3 | Medium | Switching pages briefly showed the *previous* page's data (e.g. the last movie) | **Fixed**: `useAsync` tags results with their key |
| 4 | Medium | "Show more" items from one folder could leak into the next | **Fixed**: library page keyed by folder id |
| 5 | Medium | Device profile always claimed H.264 support | **Fixed**: checked with `canPlayType`; H.264 HLS conversion is always offered |
| 6 | Low | Library tiles showed the name twice (Jellyfin's library art already contains text) | **Fixed**: name moved under the image |
| 7 | Low | On phones, "Sign out" took a whole header row | **Fixed**: search moves to its own full-width row |
| 8 | Low | Resume never appears for videos under 5 minutes | **By design** (Jellyfin server setting); documented in TRD |
| 9 | Low | Token is in media URLs (`ApiKey=`) because `<video>` can't send headers; proxies may log it | **Accepted**: standard for Jellyfin clients; HTTPS required |
| 10 | Low | "Setup help" linked to a GitHub page that exists only after merge | **Fixed**: help now lives inside the connect screen |
| 11 | Low | Hosted HTTPS app can't reach `http://` LAN servers | **By design**: detected up front with a clear message; local mode documented |

## PWA checklist
- [x] Service worker caches only the app shell (built files). Server data and video always go to the network.
- [x] `cleanupOutdatedCaches` on; stale-chunk reload in place; `sw.js`/`index.html` served with `max-age=0` (`vercel.json`).
- [x] Offline: app shell opens; data screens show "You're offline…".
- [x] Manifest: name, icons 192/512 + maskable 512, `display: standalone`, theme colors.
- [x] No secrets in client code (only the user's own token in IndexedDB). No `console` logging.
- [x] Accessibility: visible 3px focus ring, labels on all inputs, `role="alert"` errors, skip link, 44px targets.
- [x] Error states for the top risks: mixed content, CORS/unreachable, wrong password, expired token (auto sign-out), unplayable format.

---

# Session 2 — Twist build review

**Date:** 2026-11-08. **Result:** no open high-severity items.

## Checks run
| Check | Result |
|---|---|
| `npm run lint` / `npm run typecheck` / `npm run build` | Pass (0 warnings) |
| `npm test` (Vitest) | **34 pass** (12 from Session 1 + 22 new: spatial navigation, TV detection, quality profile, Tonight list, saved accounts) |
| `npm run e2e` against real **Jellyfin 12.4.0** (Docker), Chromium | **29/29 pass** — all 15 Session 1 checks, plus: converted playback, mini player keeps playing on other pages, expand without restart, 480p → smaller converted stream (`MaxHeight=480`, `VideoBitrate≈1.4 Mbps`), Back closes the player, couch arrow keys + row memory, Back restores focus to the opened card, Tonight order, Play next, Up next, finished item leaves the shelf, add a second account, Who's watching? switch, TV signed in with a code approved from another browser, remove a saved account |
| Session 1 user (old `session` key only) opens the new version | Still signed in (migrated into `accounts`) |
| Phone (iPhone 13): connect, home, item, player, home + mini player, your account, Who's watching? | No sideways scroll |

## Findings
| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **High** | On phones the empty (hidden) mini player still covered the bottom of the page and swallowed taps: the phone layout's `display: flex` beat the `[hidden]` rule | **Fixed**: `[hidden]` forced with `!important`; e2e/phone check clicks through it |
| 2 | Medium | Leaving the player while "Up next" swapped videos could stop the new video (route-vs-item race) | **Fixed**: only a route change *away from* `/play/…` stops playback; `/play/a → /play/b` doesn't |
| 3 | Medium | Code screen restarted its polling on every re-render (new callback each time) | **Fixed**: latest callback kept in a ref |
| 4 | Low | React's `autoFocus` does nothing on links, so "▶ Play" was never focused (also true in Session 1) | **Fixed for couch mode**: a new page focuses its main button (`.btn.primary`) or first card |
| 5 | Low | Player bar wrapped onto three rows on phones; mini player covered half the screen | **Fixed**: short labels ("Mini", "PiP"); phone mini player is a slim strip |
| 6 | Low | Anyone using the device can switch to a saved account | **Accepted**: same as staying signed in; Remove/Sign out revokes the token on the server. PIN is a later option |
| 7 | Low | Tonight lives on one device only | **By design** (no backend); noted in schema "revisit when" |
| 8 | Info | Picture-in-picture isn't available in every browser (e.g. Firefox's own PiP is separate) | The button only shows when `document.pictureInPictureEnabled`; the mini player works everywhere |
