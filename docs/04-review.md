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
