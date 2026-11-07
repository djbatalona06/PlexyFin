# IP / Licensing Check

**Done:** 2026-11-07, before any app code was written.

## Reference app
| Item | Finding | Action |
|---|---|---|
| Reference | Plezy (App Store id6754315964), "Media Server Client" | Used only as demand evidence + feature list |
| Its source code | Public on GitHub (`edde746/plezy`), license **GNU GPL** (read from the LICENSE file title only) | **We did not read or copy any of its source.** GPL code copied into a closed app would force our app to be GPL too. |
| Name, icon, screenshots, text | Not used | Own name, own icon, own copy |

## Our name: "Hearthreel"
| Check | Result |
|---|---|
| Web search `"Hearthreel"` / `"Hearth Reel"` media app | No app, company or product found |
| Rejected: "Couchlight" | Taken — Couchlight LLC makes a media player app (TimeslotTV) |
| Rejected: "Sofabeam" | Too close to "SofaBaton", a home-entertainment remote brand |
| Rejected: "Watchnook", "Reelwise" | Already used by other apps |
| Rejected: "PlexyFin" (repo name) | Contains "Plex", a registered trademark of Plex, Inc. **Recommend renaming the GitHub repo to `hearthreel`.** |
| Formal trademark database (USPTO/EUIPO) | **Not checked** — those sites were not reachable from this session. Do this before production (Gate 3). |

## Third-party names we mention
"Jellyfin", "Plex" and "Emby" appear only to say which servers we work with (nominative use). No logos.

## Assets
| Asset | Source | License |
|---|---|---|
| App icon (`public/icon.svg`, PNGs) | Drawn for this project (simple SVG shapes) | Ours |
| Fonts | System font stack, nothing bundled | n/a |
| Libraries | react, react-dom, react-router-dom, hls.js (Apache-2.0), idb-keyval (Apache-2.0), vite-plugin-pwa / workbox (MIT) | Permissive, compatible |
