# 03 — Twist (Gate 2 — decided)

**Decision (2026-11-08):** build **all three** candidates, plus two account features the user added at the same gate.

Built from: reference review gaps (visionOS app, PiP that keeps playing, Apple TV layout/remote, resolution choice) and our DROP/ADAPT items.

| Rank | Twist | What it is | Status |
|---|---|---|---|
| 1 | **Couch mode + PiP that keeps playing** | 10-foot layout, arrow-key/remote navigation with focus memory, and a player that keeps going while you browse (corner mini-player or the browser's picture-in-picture window) | **Built** |
| 2 | **Quality picker** | Original / 1080p / 720p / 480p in the player; remembered per server | **Built** |
| 3 | **Tonight shelf** | A watch-later list on this device, "▶ Play next" on Home, and "Up next" when an item finishes | **Built** |
| + | **Saved accounts** ("Who's watching?") | Several people on one device; switch without typing passwords | **Built** (added at Gate 2) |
| + | **Sign in with a code** (Jellyfin Quick Connect) | The TV shows 6 numbers; approve them from a phone. No password typing with a remote | **Built** (added at Gate 2) |

## Delta from reference
What the reference app's reviews asked for, and what Hearthreel does instead. "Reference" = the paid client named in `docs/spec/01-prd.md`; we used only its public listing and reviews, no code or assets.

| Reference gap (from reviews / listing) | Hearthreel delta | Where in code |
|---|---|---|
| PiP stops or is awkward when you leave the player | One `<video>` element lives above all pages. **Mini player** docks it in the corner and you keep browsing; **Picture-in-picture** uses the browser window. Expand returns to full screen **without restarting** (same play session) | `src/playback/PlaybackProvider.tsx`, `engine.ts` |
| No TV / remote-friendly layout (Apple TV complaints) | **Couch mode**: bigger type and cards, overscan-safe margins, arrow-key spatial navigation, each shelf remembers its last item, and Back returns focus to the card you opened. Turns on by itself on smart-TV / console browsers | `src/couch/*` |
| No way to pick resolution | **Quality** menu. Lower choices cap the bitrate *and* add a picture-height rule to the device profile, so the server converts to fit (verified: 480p → `MaxHeight=480`, ~1.4 Mbps). Remembered per server | `src/playback/quality.ts`, `src/api/profile.ts` |
| "What do we watch?" takes too long | **Tonight** shelf across all libraries, one-tap **Play next**, and a 10-second **Up next** countdown that plays the next item when one finishes | `src/tonight/*` |
| Sharing one TV/tablet in a household | **Who's watching?** picker with saved accounts (tokens only, never passwords) | `src/SessionProvider.tsx`, `src/pages/Accounts.tsx` |
| Typing passwords with a remote | **Sign in with a code** (Quick Connect), and any signed-in Hearthreel can approve a code under *your name → Sign in a TV with a code* | `src/components/QuickConnectWait.tsx`, `src/pages/Me.tsx` |
| visionOS app | Not built. Hearthreel is a web app; it already runs in visionOS Safari. No native visionOS work | — |

These run in any modern browser: smart-TV browsers, Fire TV Silk, Steam Deck, laptops on HDMI, phones.
