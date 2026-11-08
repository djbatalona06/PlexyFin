# 05 — Backend Schema

**None yet. Local storage only.** (YAGNI)

The user's own Jellyfin server is the backend. Hearthreel has no server, no database and no accounts.

## On-device storage (IndexedDB, via `idb-keyval`)
| Key | Shape | Notes |
|---|---|---|
| `session` | `{ serverUrl, serverName, serverId, userId, userName, token }` | The account in use. Cleared on sign out or HTTP 401 |
| `accounts` | `Session[]`, most recently used first | Every saved account (Session 2). Key per account = `serverId:userId`. Built from `session` on first run after the update, so nobody is signed out |
| `deviceId` | `string` (random UUID) | Created once; identifies this browser to the server (shared by all accounts on it) |
| `settings` | `{ couch?: boolean }` | Couch mode; missing = guess from the browser (TV → on) |
| `quality:<serverId>` | `'original' \| '1080p' \| '720p' \| '480p'` | Quality choice per server |
| `tonight:<serverId>:<userId>` | `BaseItem[]` (slim copies: id, name, type, image tag, year, episode numbers, runtime, progress) | Tonight shelf per person, max 50, watch order = order added |

**sessionStorage** (this tab only): `hearthreel:picked` = the account key picked in this tab, so a reload doesn't ask "Who's watching?" again.

Watch progress lives on the Jellyfin server (`UserData.PlaybackPositionTicks`), not on the device.

## Revisit when
Cross-device settings (Tonight on every device), a per-account PIN, or paid supporter unlocks are added.
