# 03 — App Flow

All routes are hash routes (`/#/...`) so they work on any static host.

```
[Open app]
   │ server+token saved? ──no──► /connect
   │ yes
   ▼
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
Header "Sign out" ──► clears token ──► /connect
```

## Pages
| Route | Shows | Actions |
|---|---|---|
| `/connect` | Server URL, username, password, help text for HTTPS/CORS | Connect (probe → log in → save) |
| `/` | "Continue watching" row, libraries grid | Open item, open library |
| `/library/:id` | Grid of children (folders, series, seasons, movies, episodes) | Open child |
| `/search?q=` | Results grid (movies, series, episodes) | Open result |
| `/item/:id` | Poster, title, year, runtime, overview, progress bar | Play from start, Resume |
| `/play/:id` | Full-screen video player | Play/pause/seek (native controls), PiP, Back, "Try converting" on error |

## Error paths
- Server unreachable / CORS / mixed content → message on `/connect` with the matching fix.
- Token expired (HTTP 401) → token cleared, back to `/connect`, message "Please sign in again".
- Playback error → message + "Try converting" button.
- Offline → app shell still opens; data screens show "You're offline".

## Keyboard
Tab/Shift+Tab move focus, Enter opens, Esc/Backspace on player goes back, `/` focuses search. (Full arrow-key TV navigation is the Gate 2 twist.)
