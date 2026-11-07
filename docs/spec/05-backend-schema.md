# 05 — Backend Schema

**None yet. Local storage only.** (YAGNI)

The user's own Jellyfin server is the backend. Hearthreel has no server, no database and no accounts.

## On-device storage (IndexedDB, via `idb-keyval`)
| Key | Shape | Notes |
|---|---|---|
| `session` | `{ serverUrl, serverName, serverId, userId, userName, token }` | Cleared on sign out or HTTP 401 |
| `deviceId` | `string` (random UUID) | Created once; identifies this browser to the server |

Watch progress lives on the Jellyfin server (`UserData.PlaybackPositionTicks`), not on the device.

## Revisit when
Multiple servers, cross-device settings, or paid supporter unlocks are added.
