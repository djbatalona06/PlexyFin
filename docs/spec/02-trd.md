# 02 — TRD (Technical Requirements)

## Stack
| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript | Common, typed, fast to build |
| Build | Vite 6 | Fast dev server and build |
| PWA | `vite-plugin-pwa` (Workbox, `generateSW`) | Installable app + offline shell with little code |
| Routing | `react-router-dom` 7 (hash routes) | Deep links work on any static host without rewrites |
| Storage | IndexedDB via `idb-keyval` | Server URL + token stay on the device only |
| Video | `<video>` + `hls.js` | Direct play when the browser can decode; HLS transcode otherwise |
| Hosting | Vercel (static) | Staging = `staging` branch / staging target |

Minimum server: **Jellyfin 10.9+**. Tested end to end against **Jellyfin 12.4.0** (official Docker image) (uses the new `/UserViews`, `/Items`, `/UserItems/Resume` routes; old `/Users/{id}/...` routes are marked obsolete in the server code).

## Jellyfin API used (only these — YAGNI)
Checked against the Jellyfin server source (`master`, Nov 2026).
| Purpose | Call |
|---|---|
| Probe server | `GET /System/Info/Public` |
| Log in | `POST /Users/AuthenticateByName` body `{Username, Pw}` → `AccessToken`, `User.Id` |
| Libraries | `GET /UserViews?userId=` |
| Continue watching | `GET /UserItems/Resume?userId=&mediaTypes=Video` |
| Browse / search | `GET /Items?userId=&parentId=` or `&searchTerm=&recursive=true` |
| Item details | `GET /Items/{id}?userId=` |
| Images | `GET /Items/{id}/Images/Primary?fillHeight=&quality=` |
| Playback decision | `POST /Items/{id}/PlaybackInfo` body `{UserId, DeviceProfile, StartTimeTicks, ...}` |
| Direct stream | `GET /Videos/{id}/stream?static=true&mediaSourceId=&ApiKey=` |
| Transcode (HLS) | `TranscodingUrl` returned by PlaybackInfo |
| Report progress | `POST /Sessions/Playing`, `/Sessions/Playing/Progress`, `/Sessions/Playing/Stopped` |
| Stop transcode | `DELETE /Videos/ActiveEncodings?deviceId=&playSessionId=` |
| Tonight refresh | `GET /Items?userId=&ids=a,b,c` (fresh progress for saved items) |
| Sign out (revoke token) | `POST /Sessions/Logout` |
| Code sign-in (TV side) | `GET /QuickConnect/Enabled` → `POST /QuickConnect/Initiate` (`Code`, `Secret`) → poll `GET /QuickConnect/Connect?secret=` until `Authenticated` → `POST /Users/AuthenticateWithQuickConnect` body `{Secret}` |
| Code sign-in (phone side) | `POST /QuickConnect/Authorize?code=&userId=` — the TV is signed in as this user |

All Session 2 calls were checked against a live Jellyfin 12.4.0: Quick Connect is on by default; two users signed in from the same `DeviceId` both keep valid tokens; `/Sessions/Logout` revokes only the caller's token.

**Auth header:** `Authorization: MediaBrowser Client="Hearthreel", Device="<browser>", DeviceId="<uuid>", Version="<ver>", Token="<token>"`.
We do **not** use `X-Emby-Authorization`, `X-Emby-Token` or `api_key`: the server only accepts those when `EnableLegacyAuthorization` is on, and it defaults to `false`. For media URLs (which can't carry headers) we use the `ApiKey` query parameter.

**JSON casing:** every request sends `Accept: application/json; profile="PascalCase"`. Without it, browsers send `Accept: */*` and Jellyfin 12 answers in camelCase (`serverName`), which would break our PascalCase types. (Found while testing, not in the docs.)

**HLS:** we prefer `hls.js` (light build, loaded only for converted streams) whenever Media Source is available, and fall back to native HLS (iPhone Safari). Chrome 153 reports native HLS as "maybe", but hls.js gives clearer errors.

**Resume rules are server settings:** Jellyfin only saves a resume point after `MinResumePct` (5%) of a video longer than `MinResumeDurationSeconds` (300 s). Short clips never show "Resume" — that is expected.

Time unit: Jellyfin "ticks" = 1/10,000,000 s. `seconds = ticks / 1e7`.

## Session 2 design notes
- **One `<video>` for the whole app.** `PlaybackProvider` sits above `<Routes>` and owns the only `<video>`. `/play/:id` (`PlayRoute`) just asks it to play and fill the screen. Mini/full is a CSS class change, so the element (and the stream) is never re-created. Leaving `/play/...` by any route change stops playback *unless* "Mini player" was pressed first. `engine.ts` is Session 1's player logic moved out of the page unchanged.
- **Quality.** `buildDeviceProfile(can, { maxBitrate, maxHeight })` sets `MaxStreamingBitrate`/`MaxStaticBitrate` and, below Original, adds `CodecProfiles: [{ Type: 'Video', Conditions: [{ Condition: 'LessThanEqual', Property: 'Height', Value }] }]`. Jellyfin then refuses direct play for taller files and sizes the conversion itself (it puts `MaxHeight` in the HLS URL).
- **Couch navigation** (`src/couch/spatial.ts`): candidates in the arrow's direction are scored by edge gap + 2 × sideways offset; items sharing the row/column drop the sideways cost, so Right walks along a row. Rows are `[data-nav-row]` containers; cards carry `data-nav-id` for "back to the card you opened".
- **Accounts.** `accounts` (list) + `session` (in use) in IndexedDB. With 2+ accounts a new tab asks "Who's watching?"; a reload of the same tab doesn't (`sessionStorage` flag). Switching accounts stops playback; Tonight and quality are already per server/user.

## Parity map (reference feature → web decision)
| Reference feature | Decision | Reason |
|---|---|---|
| Browse libraries, search | KEEP | Core of session 1 |
| Direct play / HLS playback | ADAPT | Only codecs the browser can decode; server transcodes the rest to H.264/AAC HLS |
| Resume + watch progress | KEEP | Reported back to the server via Sessions API |
| Picture-in-Picture | **BUILT** (twist) | Browser PiP API + our own corner mini-player; playback survives page changes |
| TV / remote layout | **BUILT** (twist) | Couch mode: spatial arrow navigation, focus memory, 10-foot sizes |
| Resolution choice | **BUILT** (twist) | Quality menu: bitrate cap + `Height` codec-profile rule |
| Multi-profile, Quick Connect | **BUILT** (Session 2) | Saved accounts + code sign-in |
| Offline downloads | DROP for now | Needs service worker + Cache/OPFS + storage quotas; later |
| HDR / Dolby Vision / audio passthrough | DROP | Not reliably possible in browsers |
| Live TV / DVR | DROP for now | Later phase |
| Themes (paid "Supporter") | LATER | Candidate monetization |
| Plex, Emby | LATER | Jellyfin first: open API, no account wall |

## Top risks (checked first) and decisions
1. **Mixed content.** An HTTPS page (our staging URL) may not call an `http://` server; browsers block it.
   **Supported setups:**
   - **A (recommended):** Jellyfin reachable over **HTTPS** with a valid certificate (reverse proxy such as Caddy/Nginx, Tailscale Serve, or a Cloudflare Tunnel).
   - **B (local mode):** run Hearthreel yourself over `http://` (`npm run dev` or `npm run preview`) to talk to an `http://` LAN server.
   - **Not supported:** hosted HTTPS app → `http://` server. The login screen detects this and explains the fix before trying.
   - Also note: Chrome 142+ shows a "local network access" permission prompt when a public site calls a private IP. Users must click Allow.
2. **CORS.** Jellyfin's `CorsHosts` setting defaults to `*` (all origins allowed), so a stock server works. If an admin narrowed it, or a reverse proxy strips headers, the server must allow the Hearthreel origin. Steps: `docs/server-setup.md`.
3. **Codecs.** We send a device profile built from `video.canPlayType()` / `MediaSource.isTypeSupported()`. If the browser can't play the file directly, the server returns an HLS transcode URL. If playback still fails, the player shows a plain message and a **"Try converting"** button that re-requests PlaybackInfo with direct play turned off.
4. **IP/licensing.** See `docs/ip-check.md` (done before code).

## Security
- No secrets in the repo. The only secret is the user's Jellyfin token, stored in IndexedDB on their device.
- The password is sent once to the user's own server and never stored.
- No analytics, no third-party calls.
- Saved accounts keep one token per account in IndexedDB on that device (never passwords). Anyone who can use the device can switch to a saved account, the same as staying signed in. "Sign out" and "Remove" revoke the token on the server (`/Sessions/Logout`) and delete it locally. A per-account PIN is not built (later, if asked).
- Quick Connect codes are approved only by an already signed-in user, and expire on the server (Jellyfin default ~10 minutes).

## Environment variables
| Name | Where | Purpose |
|---|---|---|
| `VITE_APP_ENV` | Vercel project env: Preview on branch `staging` = `staging`; Production = `production` | Shows a "STAGING" badge; not secret |
