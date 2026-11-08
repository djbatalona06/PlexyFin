# 03 — App Flow

All routes are hash routes (`/#/...`) so they work on any static host.

```
[Open app]
   │ any saved accounts? ──no──► /connect ── Connect (password) or "Sign in with a code" ──┐
   │ 2+ saved, new tab? ──yes──► /accounts ("Who's watching?") ── pick ──────────────────────┤
   │ 1 saved (or this tab already picked)                                                    │
   ▼ ◄───────────────────────────────────────────────────────────────────────────────────────┘
/ (Home) ── click library ──► /library/:id ── click folder/series/season ──► /library/:id (child)
   │                                   │
   │ search box (header)                └── click movie/episode ──► /item/:id
   ▼                                                                 │
/search?q= ── click result ──────────────────────────────────────────┤
                                                                     ▼
                                              /item/:id ── Play / Resume ──► /play/:id?t=<seconds>
                                                                                │ Back
                                                                                ▼
                                                                         returns to /item/:id
Header avatar ──► /me ── Switch user ──► /accounts
                     ├── Add another account ──► /connect?add=1
                     ├── Sign in a TV with a code (approve 6 digits)
                     └── Sign out ──► removes this account ──► /accounts or /connect
Player "Mini player" (or "i") ──► back to the previous page, video keeps playing in the corner
Mini player ⤢ ──► /play/:id full screen again (no restart) · ✕ stops it
Video on the Tonight shelf ends ──► "Up next" (10 s) ──► next Tonight item
```

## Pages
| Route | Shows | Actions |
|---|---|---|
| `/connect` | Server URL, username, password, help text for HTTPS/CORS. `?add=1`: add another account (server prefilled) | Connect (probe → log in → save); **Sign in with a code instead** (shows 6 digits, waits for approval) |
| `/accounts` | "Who's watching?": saved accounts as big avatars, "Add account" | Pick (no password), Manage → Remove |
| `/me` | Your name, server, number of saved accounts | Switch user, Add another account, approve a TV's code, Sign out |
| `/` | "Tonight" row with **▶ Play next** (when not empty), "Continue watching" row, libraries grid | Open item, open library, Play next |
| `/library/:id` | Grid of children (folders, series, seasons, movies, episodes) | Open child |
| `/search?q=` | Results grid (movies, series, episodes) | Open result |
| `/item/:id` | Poster, title, year, runtime, overview, progress bar | Play from start, Resume, **＋ Tonight / ✓ On Tonight** |
| `/play/:id` | Full-screen video player | Play/pause/seek (native controls), **Quality**, **Mini player**, **Picture-in-picture**, Back, "Try converting" on error |
| *(any page)* | Mini player in the corner while something plays | Play/Pause, Expand, Close |

## Error paths
- Server unreachable / CORS / mixed content → message on `/connect` with the matching fix.
- Token expired (HTTP 401) → token cleared, back to `/connect`, message "Please sign in again".
- Playback error → message + "Try converting" button.
- Offline → app shell still opens; data screens show "You're offline".

## Error paths (Session 2)
- Quick Connect turned off on the server → message on `/connect` explaining where an admin turns it on.
- Code expired → "This code expired. Get a new one." with a button.
- Wrong code on `/me` → "That code didn't work…".
- Token expired → that account is removed; with other saved accounts you land on `/accounts` with the message, otherwise `/connect`.

## Keyboard / remote
Tab/Shift+Tab move focus, Enter opens, `/` focuses search.
Player: Esc/Backspace = back (stops), `i` = mini player; with the video focused, arrows seek / change volume and ↑ moves to the top bar.
**Couch mode** (header button; on by default on TV browsers): arrow keys move focus to the nearest item; each shelf remembers its last item; Back returns focus to the card you opened; a new page focuses its main button (Play / Play next) or first card.
