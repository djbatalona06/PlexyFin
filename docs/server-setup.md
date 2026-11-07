# Connect your Jellyfin server (setup for users)

Hearthreel runs in your browser and talks **directly** to your Jellyfin server. Two things must be true.

## 1. Your server needs HTTPS (for the hosted app)
The hosted app uses `https://`. Browsers block an `https://` page from calling an `http://` server ("mixed content").

Pick one:
- **Reverse proxy** (Caddy, Nginx, Traefik) with a real certificate, e.g. `https://jellyfin.example.com`.
- **Tailscale Serve:** `tailscale serve --bg 8096` gives `https://<machine>.<tailnet>.ts.net`.
- **Cloudflare Tunnel** to `http://localhost:8096`.

Only have `http://192.168.x.x:8096`? Run Hearthreel locally instead:
```bash
npm install
npm run dev -- --host
```
Then open `http://localhost:5173` (it's allowed to call `http://` servers).

**Chrome note:** when a public website calls a server on your home network, Chrome may ask "Allow access to devices on your local network?". Click **Allow**.

## 2. Your server must allow the app (CORS)
Out of the box Jellyfin allows every website (`CorsHosts` = `*`), so you usually do nothing.

If you changed it, add the Hearthreel address:
1. Stop Jellyfin.
2. Open `system.xml` in the Jellyfin config folder.
3. In `<CorsHosts>`, add `<string>https://YOUR-HEARTHREEL-URL</string>` (or keep `<string>*</string>`).
4. Start Jellyfin.

Using a reverse proxy? Make sure it does **not** strip `Access-Control-Allow-*` headers or block `OPTIONS` requests.

## Quick test
Open `https://YOUR-SERVER/System/Info/Public` in the browser. You should see JSON with `"ServerName"`. If that works, Hearthreel can connect.
